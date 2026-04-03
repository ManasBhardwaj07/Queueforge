const { Queue, Worker } = require('bullmq');
const { createJobProcessor } = require('./jobProcessor');
const { JobModel, JOB_STATUS } = require('../models/jobModel');
const { isRetryableError } = require('./jobErrors');

function toJsonLog(payload) {
  return JSON.stringify(payload);
}

function createWorkerProcessor({
  processor,
  jobModel,
  logger,
  dlqQueue,
}) {
  return async function workerProcessor(job) {
    const dbId = job.data?.dbId;

    if (!dbId) {
      throw new Error(`Missing dbId in job payload for queue job ${job.id}`);
    }

    const claimedJob = await jobModel.findOneAndUpdate(
      {
        _id: dbId,
        status: JOB_STATUS.WAITING,
      },
      {
        $set: {
          status: JOB_STATUS.ACTIVE,
          processedAt: new Date(),
          failedReason: null,
          finalFailureReason: null,
          retryAttemptsExhausted: false,
        },
        $inc: {
          attemptsStarted: 1,
        },
      },
      { returnDocument: 'after' },
    );

    if (!claimedJob) {
      throw new Error(`Unable to claim job document ${dbId} for queue job ${job.id}`);
    }

    try {
      const result = await processor(job);

      await jobModel.findByIdAndUpdate(dbId, {
        $set: {
          status: JOB_STATUS.COMPLETED,
          result,
          failedReason: null,
          finalFailureReason: null,
          retryAttemptsExhausted: false,
          attemptsMade: job.attemptsMade,
          finishedAt: new Date(),
        },
      });

      logger.info(toJsonLog({
        level: 'info',
        event: 'completion',
        jobId: String(job.id),
        attempt: job.attemptsMade,
        max: job.opts?.attempts || 1,
      }));

      return result;
    } catch (error) {
      const maxAttempts = job.opts?.attempts || 1;
      const attemptsMadeAfterFailure = job.attemptsMade + 1;
      const retryable = isRetryableError(error);
      const retriesExhausted = attemptsMadeAfterFailure >= maxAttempts;
      const isFinalFailure = !retryable || retriesExhausted;

      if (retryable && !isFinalFailure) {
        logger.info(toJsonLog({
          level: 'info',
          event: 'retry',
          jobId: String(job.id),
          attempt: attemptsMadeAfterFailure,
          max: maxAttempts,
        }));
      }

      if (isFinalFailure) {
        const finalFailureReason = retriesExhausted
          ? 'MAX_RETRIES_REACHED'
          : 'PERMANENT_ERROR';

        await jobModel.findByIdAndUpdate(dbId, {
          $set: {
            status: JOB_STATUS.FAILED,
            failedReason: retriesExhausted
              ? 'Max retries reached'
              : error.message,
            finalFailureReason,
            retryAttemptsExhausted: retriesExhausted,
            attemptsMade: attemptsMadeAfterFailure,
            finishedAt: new Date(),
          },
        });

        logger.info(toJsonLog({
          level: 'info',
          event: 'final_failure',
          jobId: String(job.id),
          attempt: attemptsMadeAfterFailure,
          max: maxAttempts,
          reason: finalFailureReason,
        }));

        if (!retryable && typeof job.discard === 'function') {
          job.discard();
        }

        if (dlqQueue) {
          await dlqQueue.add('failedJob', {
            originalJobId: String(job.id),
            dbId,
            type: job.name,
            payload: job.data?.payload || {},
            failedReason: error.message,
            finalFailureReason,
            attemptsMade: attemptsMadeAfterFailure,
            maxAttempts,
            failedAt: new Date().toISOString(),
          });
        }
      } else {
        await jobModel.findByIdAndUpdate(dbId, {
          $set: {
            status: JOB_STATUS.WAITING,
            failedReason: error.message,
            finalFailureReason: null,
            retryAttemptsExhausted: false,
            attemptsMade: attemptsMadeAfterFailure,
          },
        });
      }

      throw error;
    }
  };
}

function createQueueWorker({
  queueName,
  connection,
  logger = console,
  concurrency = 1,
  baseDelayMs = 300,
  staleActiveThresholdMs = 10 * 60 * 1000,
  dlq = { enabled: false, queueName: 'queueforge-dlq' },
  jobModel = JobModel,
}) {
  const dlqQueue = dlq.enabled
    ? new Queue(dlq.queueName, {
        connection,
      })
    : null;

  const processor = createJobProcessor({ logger, baseDelayMs });

  async function markStaleActiveJobs() {
    const staleBefore = new Date(Date.now() - staleActiveThresholdMs);

    await jobModel.updateMany(
      {
        status: JOB_STATUS.ACTIVE,
        processedAt: {
          $lt: staleBefore,
        },
      },
      {
        $set: {
          status: JOB_STATUS.FAILED,
          failedReason: 'Job marked failed due to stale ACTIVE timeout.',
          finalFailureReason: 'STALE_ACTIVE_TIMEOUT',
          retryAttemptsExhausted: true,
          finishedAt: new Date(),
        },
      },
    );
  }

  const workerProcessor = createWorkerProcessor({
    processor,
    jobModel,
    logger,
    dlqQueue,
  });

  const worker = new Worker(queueName, workerProcessor, {
    connection,
    concurrency,
  });

  const originalClose = worker.close.bind(worker);
  worker.close = async () => {
    await originalClose();

    if (dlqQueue) {
      await dlqQueue.close();
    }
  };

  markStaleActiveJobs().catch((error) => {
    logger.error(error);
  });

  return worker;
}

module.exports = {
  createQueueWorker,
  createWorkerProcessor,
};
