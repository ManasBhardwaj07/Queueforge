const DEFAULT_PORT = 3000;
const DEFAULT_REDIS_HOST = '127.0.0.1';
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_REDIS_DB = 0;
const DEFAULT_QUEUE_NAME = 'queueforge-jobs';
const DEFAULT_WORKER_CONCURRENCY = 1;
const DEFAULT_JOB_PROCESSING_DELAY_MS = 300;
const DEFAULT_MONGO_HOST = '127.0.0.1';
const DEFAULT_MONGO_PORT = 27017;
const DEFAULT_MONGO_DB = 'queueforge';

function parseInteger(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function loadEnv(source = process.env) {
  return {
    port: parseInteger(source.PORT, DEFAULT_PORT),
    queueName: source.JOBS_QUEUE_NAME || DEFAULT_QUEUE_NAME,
    workerConcurrency: parseInteger(source.WORKER_CONCURRENCY, DEFAULT_WORKER_CONCURRENCY),
    jobProcessingDelayMs: parseInteger(source.JOB_PROCESSING_DELAY_MS, DEFAULT_JOB_PROCESSING_DELAY_MS),
    redis: {
      url: source.REDIS_URL || '',
      host: source.REDIS_HOST || DEFAULT_REDIS_HOST,
      port: parseInteger(source.REDIS_PORT, DEFAULT_REDIS_PORT),
      username: source.REDIS_USERNAME || undefined,
      password: source.REDIS_PASSWORD || undefined,
      db: parseInteger(source.REDIS_DB, DEFAULT_REDIS_DB),
    },
    mongodb: {
      uri: source.MONGO_URI || '',
      host: source.MONGO_HOST || DEFAULT_MONGO_HOST,
      port: parseInteger(source.MONGO_PORT, DEFAULT_MONGO_PORT),
      db: source.MONGO_DB || DEFAULT_MONGO_DB,
      username: source.MONGO_USERNAME || undefined,
      password: source.MONGO_PASSWORD || undefined,
    },
  };
}

module.exports = {
  loadEnv,
};
