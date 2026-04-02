const { Queue } = require('bullmq');
const { JOB_TYPES } = require('../queue/jobTypes');

const STATUS_BY_BULLMQ_STATE = Object.freeze({
  waiting: 'WAITING',
  active: 'ACTIVE',
  completed: 'COMPLETED',
  failed: 'FAILED',
  delayed: 'WAITING',
  paused: 'WAITING',
  'waiting-children': 'WAITING',
});

function mapJobState(state) {
  return STATUS_BY_BULLMQ_STATE[state] || 'UNKNOWN';
}

function createJobService({ queueName, connection }) {
  const queue = new Queue(queueName, {
    connection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false,
    },
  });

  async function createJob(input) {
    const job = await queue.add(
      input.type,
      {
        type: input.type,
        payload: input.payload,
        createdAt: new Date().toISOString(),
      },
      {
        jobId: undefined,
      },
    );

    return {
      jobId: job.id,
      type: input.type,
      status: 'WAITING',
    };
  }

  async function getJob(jobId) {
    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const rawState = await job.getState();
    const status = mapJobState(rawState);

    return {
      jobId: job.id,
      type: job.name || job.data?.type || JOB_TYPES.EMAIL,
      status,
      rawState,
      attemptsMade: job.attemptsMade,
      attemptsStarted: job.attemptsStarted,
      createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : null,
      processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      payload: job.data?.payload || {},
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
    };
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
