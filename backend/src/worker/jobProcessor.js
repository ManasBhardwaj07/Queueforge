const { JOB_TYPES } = require('../queue/jobTypes');
const { RetryableError, PermanentError } = require('./jobErrors');

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

    const delayMs = buildDelay(jobType, baseDelayMs);
    await sleep(delayMs);

    if (payload.simulateFailure === 'retryable') {
      throw new RetryableError('Simulated transient failure for retry flow.', {
        code: 'SIM_RETRYABLE',
      });
    }

    if (payload.simulateFailure === 'permanent') {
      throw new PermanentError('Simulated permanent failure for terminal fail flow.', {
        code: 'SIM_PERMANENT',
      });
    }

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

    return {
      ...result,
      processedAt: new Date().toISOString(),
    };
  };
}

module.exports = {
  createJobProcessor,
};
