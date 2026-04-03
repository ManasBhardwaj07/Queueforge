const { Queue } = require('bullmq');
const { JobModel, JOB_STATUS } = require('../models/jobModel');

function mapJobState(status) {
  if (!status) {
    return 'UNKNOWN';
  }

  return status;
}

function toApiJob(document) {
  if (!document) {
    return null;
  }

  const status = mapJobState(document.status);

  return {
    jobId: document.jobId,
    type: document.type,
    status,
    rawState: status.toLowerCase(),
    attemptsMade: document.attemptsMade ?? document.attempts ?? 0,
    attemptsStarted: document.attemptsStarted ?? 0,
    createdAt: document.createdAt ? new Date(document.createdAt).toISOString() : null,
    processedAt: document.processedAt ? new Date(document.processedAt).toISOString() : null,
    finishedAt: document.finishedAt ? new Date(document.finishedAt).toISOString() : null,
    payload: document.payload || {},
    result: document.result ?? null,
    failedReason: document.failedReason ?? null,
  };
}

function createJobService({ queueName, connection, jobModel = JobModel, queueFactory = null }) {
  const queue = (queueFactory || ((name, options) => new Queue(name, options)))(queueName, {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false,
    },
  });

  async function createJob(input) {
    const createdDocument = await jobModel.create({
      type: input.type,
      payload: input.payload,
      status: JOB_STATUS.WAITING,
    });

    try {
      const queuedJob = await queue.add(input.type, {
        type: input.type,
        payload: input.payload,
        dbId: String(createdDocument._id),
      });

      createdDocument.jobId = String(queuedJob.id);
      await createdDocument.save();

      return {
        jobId: createdDocument.jobId,
        type: createdDocument.type,
        status: createdDocument.status,
      };
    } catch (error) {
      await jobModel.findByIdAndUpdate(createdDocument._id, {
        $set: {
          status: JOB_STATUS.FAILED,
          failedReason: `Queue enqueue failed: ${error.message}`,
          finishedAt: new Date(),
        },
      });

      throw error;
    }
  }

  async function getJob(jobId) {
    const job = await jobModel.findOne({ jobId }).lean();

    if (!job) {
      return null;
    }

    return toApiJob(job);
  }

  async function close() {
    await queue.close();
  }

  return {
    queue,
    createJob,
    getJob,
    close,
  };
}

module.exports = {
  createJobService,
  mapJobState,
};
