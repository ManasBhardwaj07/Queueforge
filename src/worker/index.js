const { Worker } = require('bullmq');
const { createJobProcessor } = require('./jobProcessor');
const { JobModel, JOB_STATUS } = require('../models/jobModel');

function createQueueWorker({
  queueName,
  connection,
  logger = console,
  concurrency = 1,
  baseDelayMs = 300,
  jobModel = JobModel,
}) {
  const processor = createJobProcessor({ logger, baseDelayMs });

  const workerProcessor = async (job) => {
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
        },
        $inc: {
          attempts: 1,
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
          finishedAt: new Date(),
        },
        $inc: {
          attemptsMade: 1,
        },
      });

      return result;
    } catch (error) {
      await jobModel.findByIdAndUpdate(dbId, {
        $set: {
          status: JOB_STATUS.FAILED,
          failedReason: error.message,
          finishedAt: new Date(),
        },
        $inc: {
          attemptsMade: 1,
        },
      });

      throw error;
    }
  };

  return new Worker(queueName, workerProcessor, {
    connection,
    concurrency,
  });
}

module.exports = {
  createQueueWorker,
};
