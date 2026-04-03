class RetryableError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'RetryableError';
    this.code = options.code || null;
  }
}

class PermanentError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'PermanentError';
    this.code = options.code || null;
  }
}

function isRetryableError(error) {
  return error instanceof RetryableError;
}

module.exports = {
  RetryableError,
  PermanentError,
  isRetryableError,
};
