const { JOB_TYPES } = require('../queue/jobTypes');
const { RetryableError, PermanentError } = require('./jobErrors');
const { createHash } = require('node:crypto');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildDelay(baseDelayMs) {
  const normalizedBase = Number.isFinite(baseDelayMs) ? baseDelayMs : 300;
  const minDelay = Math.max(normalizedBase, 1500);
  const maxDelay = Math.max(minDelay + 500, 3000);

  return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
}

function normalizeReportRows(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
    .map((row) => {
      const normalized = {};
      for (const [key, value] of Object.entries(row)) {
        if (value === null || value === undefined) {
          normalized[key] = null;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          normalized[key] = value;
        } else {
          normalized[key] = String(value);
        }
      }
      return normalized;
    });
}

function buildReportSummary(payload) {
  const rows = normalizeReportRows(payload.rows);
  const fieldSet = new Set();
  let numericValues = 0;
  let numericSum = 0;

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      fieldSet.add(key);
      if (typeof value === 'number' && Number.isFinite(value)) {
        numericValues += 1;
        numericSum += value;
      }
    }
  }

  const summaryInput = {
    reportName: payload.reportName || null,
    rowCount: rows.length,
    fields: [...fieldSet].sort(),
    numericValues,
    numericSum,
  };

  const checksum = createHash('sha256')
    .update(JSON.stringify(summaryInput))
    .digest('hex');

  return {
    rowCount: summaryInput.rowCount,
    fieldCount: summaryInput.fields.length,
    fields: summaryInput.fields,
    numericValues: summaryInput.numericValues,
    numericSum: Number(summaryInput.numericSum.toFixed(2)),
    checksum,
  };
}

function createJobProcessor({ logger = console, baseDelayMs = 2000 } = {}) {
  return async function processJob(job) {
    const jobType = job.data?.type || 'unknown';
    const payload = job.data?.payload || {};

    const delayMs = buildDelay(baseDelayMs);
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
      const summary = buildReportSummary(payload);
      result = {
        message: 'Report job processed successfully.',
        reportName: payload.reportName,
        reportSummary: summary,
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
