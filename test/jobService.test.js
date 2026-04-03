const assert = require('node:assert/strict');
const test = require('node:test');
const { createJobService } = require('../src/services/jobService');

function createInMemoryJobModel() {
  const records = new Map();
  let counter = 0;

  return {
    records,
    async create(input) {
      counter += 1;
      const _id = String(counter);
      const now = new Date();
      const doc = {
        _id,
        type: input.type,
        payload: input.payload,
        status: input.status,
        attempts: 0,
        attemptsMade: 0,
        attemptsStarted: 0,
        result: null,
        failedReason: null,
        processedAt: null,
        finishedAt: null,
        createdAt: now,
        updatedAt: now,
        jobId: null,
        async save() {
          this.updatedAt = new Date();
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

      const setPatch = update.$set || {};
      records.set(String(id), {
        ...existing,
        ...setPatch,
        updatedAt: new Date(),
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

test('createJob stores DB record, enqueues, and persists BullMQ jobId', async () => {
  const model = createInMemoryJobModel();
  const queue = {
    async add() {
      return { id: '901' };
    },
    async close() {},
  };

  const service = createJobService({
    queueName: 'queueforge-jobs',
    connection: {},
    jobModel: model,
    queueFactory: () => queue,
  });

  const created = await service.createJob({
    type: 'email',
    payload: {
      recipientEmail: 'dev@example.com',
    },
  });

  assert.equal(created.jobId, '901');
  assert.equal(created.status, 'WAITING');
  const record = [...model.records.values()][0];
  assert.equal(record.jobId, '901');
  assert.equal(record.status, 'WAITING');
});

test('createJob marks DB record as FAILED if queue enqueue fails', async () => {
  const model = createInMemoryJobModel();
  const queue = {
    async add() {
      throw new Error('Redis unavailable');
    },
    async close() {},
  };

  const service = createJobService({
    queueName: 'queueforge-jobs',
    connection: {},
    jobModel: model,
    queueFactory: () => queue,
  });

  await assert.rejects(
    service.createJob({
      type: 'report',
      payload: {
        reportName: 'daily-summary',
      },
    }),
    /Redis unavailable/,
  );

  const record = [...model.records.values()][0];
  assert.equal(record.status, 'FAILED');
  assert.match(record.failedReason, /Queue enqueue failed/);
});

test('getJob reads state from Mongo document', async () => {
  const model = createInMemoryJobModel();
  const queue = {
    async add() {
      return { id: '2201' };
    },
    async close() {},
  };

  const service = createJobService({
    queueName: 'queueforge-jobs',
    connection: {},
    jobModel: model,
    queueFactory: () => queue,
  });

  const created = await service.createJob({
    type: 'email',
    payload: {
      recipientEmail: 'dev@example.com',
    },
  });

  await model.findByIdAndUpdate('1', {
    $set: {
      status: 'COMPLETED',
      result: {
        ok: true,
      },
      finishedAt: new Date('2026-04-03T00:00:10.000Z'),
    },
  });

  const job = await service.getJob(created.jobId);

  assert.equal(job.jobId, '2201');
  assert.equal(job.status, 'COMPLETED');
  assert.deepEqual(job.result, { ok: true });
});
