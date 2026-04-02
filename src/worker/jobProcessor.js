const { JOB_TYPES } = require('../queue/jobTypes');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildDelay(jobType, baseDelayMs) {
  if (jobType === JOB_TYPES.REPORT) {
    return Math.max(baseDelayMs, 500);
  }

  return Math.max(baseDelayMs, 250);
}

function createJobProcessor({ logger = console, baseDelayMs = 300 } = {}) {
  return async function processJob(job) {
    const jobType = job.data?.type || 'unknown';
    const payload = job.data?.payload || {};

    logger.info(`Starting job ${job.id} (${jobType})`);

    const delayMs = buildDelay(jobType, baseDelayMs);
    await sleep(delayMs);

    let result;
    if (jobType === JOB_TYPES.EMAIL) {
      result = {
        message: 'Email job processed successfully.',
        recipientEmail: payload.recipientEmail,
        subject: payload.subject || null,
      };
    } else if (jobType === JOB_TYPES.REPORT) {
      result = {
        message: 'Report job processed successfully.',
        reportName: payload.reportName,
      };
    } else {
      result = {
        message: 'Job processed successfully.',
        jobType,
      };
    }

    logger.info(`Completed job ${job.id} (${jobType})`);

    return {
      ...result,
      processedAt: new Date().toISOString(),
    };
  };
}

module.exports = {
  createJobProcessor,
};
