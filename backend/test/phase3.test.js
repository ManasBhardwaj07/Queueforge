const assert = require('node:assert/strict');
const test = require('node:test');
const { createJobService } = require('../src/services/jobService');
const { createJobProcessor } = require('../src/worker/jobProcessor');
const { createWorkerProcessor } = require('../src/worker/index');
const { RetryableError, PermanentError } = require('../src/worker/jobErrors');
const { loadEnv, validateEnv } = require('../src/config/env');

function createInMemoryJobModel() {
  const records = new Map();
  let counter = 0;

  return {
    async create(input) {
      counter += 1;
      const _id = String(counter);
      const doc = {
        _id,
        type: input.type,
        payload: input.payload,
        status: input.status,
        attemptsMade: 0,
        attemptsStarted: 0,
        failedReason: null,
        finalFailureReason: null,
        retryAttemptsExhausted: false,
        finishedAt: null,
        createdAt: new Date(),
        processedAt: null,
        jobId: null,
        async save() {
          records.set(_id, { ...this });
          return this;
        },
      };
      records.set(_id, { ...doc });
      return doc;
    },
    async findByIdAndUpdate(id, update) {
      const existing = records.get(String(id));
      if (!existing) {
        return null;
      }

      records.set(String(id), {
        ...existing,
        ...(update.$set || {}),
      });

      return records.get(String(id));
    },
    findOne(query) {
      const found = [...records.values()].find((record) => record.jobId === query.jobId) || null;

      return {
        async lean() {
          return found;
        },
      };
    },
  };
}

test('job service enqueues with phase-3 attempts and exponential backoff', async () => {
  const model = createInMemoryJobModel();
  const calls = [];
  const queue = {
    async add(...args) {
      calls.push(args);
      return { id: '5001' };
    },
    async close() {},
  };

  const service = createJobService({
    queueName: 'queueforge-jobs',
    connection: {},
    retryConfig: {
      maxAttempts: 3,
      backoffDelayMs: 2000,
    },
    jobModel: model,
    queueFactory: () => queue,
  });

  await service.createJob({
    type: 'report',
    payload: {
      reportName: 'retry-check',
    },
  });

  const [, , opts] = calls[0];
  assert.equal(opts.attempts, 3);
  assert.equal(opts.backoff.type, 'exponential');
  assert.equal(opts.backoff.delay, 2000);
});

test('job processor throws typed retryable error for retry simulation payload', async () => {
  const processJob = createJobProcessor({ logger: { info() {} }, baseDelayMs: 1 });

  await assert.rejects(
    processJob({
      id: 'r-1',
      data: {
        type: 'report',
        payload: {
          reportName: 'x',
          simulateFailure: 'retryable',
        },
      },
    }),
    (error) => error instanceof RetryableError,
  );
});

test('job processor throws typed permanent error for terminal failure simulation payload', async () => {
  const processJob = createJobProcessor({ logger: { info() {} }, baseDelayMs: 1 });

  await assert.rejects(
    processJob({
      id: 'p-1',
      data: {
        type: 'email',
        payload: {
          recipientEmail: 'dev@example.com',
          simulateFailure: 'permanent',
        },
      },
    }),
    (error) => error instanceof PermanentError,
  );
});

test('env parsing applies phase-3 reliability defaults and flags', () => {
  const env = loadEnv({
    MONGO_URI: 'mongodb://mongo.test:27017/queueforge',
    REDIS_HOST: '127.0.0.1',
    REDIS_PORT: '6379',
    ENABLE_DLQ: 'true',
  });

  assert.equal(env.retry.maxAttempts, 3);
  assert.equal(env.retry.backoffDelayMs, 2000);
  assert.equal(env.dlq.enabled, true);
  assert.equal(env.dlq.queueName, 'queueforge-dlq');
});

test('env validation fails fast when required settings are invalid', () => {
  assert.throws(
    () => validateEnv(loadEnv({ REDIS_HOST: '127.0.0.1', REDIS_PORT: '6379' })),
    /MONGO_URI missing/,
  );

  assert.throws(
    () => validateEnv(loadEnv({ MONGO_URI: 'mongodb://mongo.test:27017/queueforge', REDIS_HOST: '', REDIS_PORT: '0' })),
    /Invalid Redis host\/port configuration/,
  );

  assert.throws(
    () => validateEnv(loadEnv({ MONGO_URI: 'mongodb://mongo.test:27017/queueforge', JOB_MAX_ATTEMPTS: '0' })),
    /Invalid RETRY_ATTEMPTS/,
  );
});

test('worker claim guard allows only one processor to claim WAITING job', async () => {
  const state = {
    status: 'WAITING',
  };

  const jobModel = {
    async findOneAndUpdate(query, update) {
      if (query.status !== state.status) {
        return null;
      }

      state.status = update.$set.status;
      return { _id: 'db-1', status: state.status };
    },
    async findByIdAndUpdate() {
      return null;
    },
  };

  const processor = async () => ({ ok: true });
  const workerProcessor = createWorkerProcessor({
    processor,
    jobModel,
    logger: { info() {}, error() {} },
    dlqQueue: null,
  });

  const job = {
    id: 'job-1',
    name: 'report',
    data: { dbId: 'db-1', payload: { reportName: 'x' } },
    opts: { attempts: 3 },
    attemptsMade: 0,
    discard() {},
  };

  const first = workerProcessor(job);
  const second = workerProcessor(job);

  await assert.doesNotReject(first);
  await assert.rejects(second, /Unable to claim job document/);
});
