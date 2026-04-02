const { JOB_TYPE_LIST, JOB_TYPES } = require('../queue/jobTypes');

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function isValidEmail(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateJobRequest(body) {
  const errors = [];

  if (!isPlainObject(body)) {
    return {
      valid: false,
      errors: ['Request body must be a JSON object.'],
      value: null,
    };
  }

  const type = normalizeText(body.type);
  if (!type) {
    errors.push('Job type is required.');
  } else if (!JOB_TYPE_LIST.includes(type)) {
    errors.push(`Job type must be one of: ${JOB_TYPE_LIST.join(', ')}.`);
  }

  const payload = body.payload === undefined ? {} : body.payload;
  if (!isPlainObject(payload)) {
    errors.push('payload must be a JSON object when provided.');
  }

  const normalizedPayload = isPlainObject(payload) ? { ...payload } : {};

  if (type === JOB_TYPES.EMAIL) {
    const recipientEmail = normalizeText(normalizedPayload.recipientEmail);
    if (!recipientEmail) {
      errors.push('Email jobs require payload.recipientEmail.');
    } else if (!isValidEmail(recipientEmail)) {
      errors.push('payload.recipientEmail must be a valid email address.');
    }

    normalizedPayload.recipientEmail = recipientEmail;
    if (normalizedPayload.subject !== undefined) {
      normalizedPayload.subject = normalizeText(normalizedPayload.subject);
    }
  }

  if (type === JOB_TYPES.REPORT) {
    const reportName = normalizeText(normalizedPayload.reportName);
    if (!reportName) {
      errors.push('Report jobs require payload.reportName.');
    }

    normalizedPayload.reportName = reportName;
  }

  return {
    valid: errors.length === 0,
    errors,
    value: errors.length === 0
      ? {
          type,
          payload: normalizedPayload,
        }
      : null,
  };
}

module.exports = {
  validateJobRequest,
};
