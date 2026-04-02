const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const { createApp } = require('../src/app');

function createMockJobService() {
  const jobs = new Map();
  let nextId = 1;

  return {
    async createJob(input) {
      const jobId = String(nextId++);
      const job = {
        jobId,
        type: input.type,
        status: 'WAITING',
      };

      jobs.set(jobId, {
        jobId,
        type: input.type,
        status: 'WAITING',
        rawState: 'waiting',
        attemptsMade: 0,
        attemptsStarted: 0,
        createdAt: '2026-04-03T00:00:00.000Z',
        processedAt: null,
        finishedAt: null,
        payload: input.payload,
        result: null,
        failedReason: null,
      });

      return job;
    },
    async getJob(jobId) {
      return jobs.get(jobId) || null;
    },
    seed(jobId, value) {
      jobs.set(jobId, value);
    },
  };
}

async function startTestServer(app) {
  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    server,
    baseUrl,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test('POST /jobs queues an email job', async () => {
  const jobService = createMockJobService();
  const app = createApp({ jobService, logger: { error() {} } });
  const server = await startTestServer(app);

  try {
    const response = await fetch(`${server.baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'email',
        payload: {
          recipientEmail: 'dev@example.com',
          subject: 'Welcome',
        },
      }),
    });

    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.message, 'Job queued successfully.');
    assert.equal(body.job.type, 'email');
    assert.equal(body.job.status, 'WAITING');
    assert.equal(body.job.jobId, '1');
  } finally {
    await server.close();
  }
});

test('POST /jobs rejects invalid job payloads', async () => {
  const jobService = createMockJobService();
  const app = createApp({ jobService, logger: { error() {} } });
  const server = await startTestServer(app);

  try {
    const response = await fetch(`${server.baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'email',
        payload: {},
      }),
    });

    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Invalid job request.');
    assert.ok(body.details.some((message) => message.includes('recipientEmail')));
  } finally {
    await server.close();
  }
});

test('GET /jobs/:id returns persisted job details', async () => {
  const jobService = createMockJobService();
  jobService.seed('42', {
    jobId: '42',
    type: 'report',
    status: 'COMPLETED',
    rawState: 'completed',
    attemptsMade: 1,
    attemptsStarted: 1,
    createdAt: '2026-04-03T00:00:00.000Z',
    processedAt: '2026-04-03T00:00:05.000Z',
    finishedAt: '2026-04-03T00:00:06.000Z',
    payload: {
      reportName: 'daily-summary',
    },
    result: {
      message: 'Report job processed successfully.',
    },
    failedReason: null,
  });

  const app = createApp({ jobService, logger: { error() {} } });
  const server = await startTestServer(app);

  try {
    const response = await fetch(`${server.baseUrl}/jobs/42`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.job.jobId, '42');
    assert.equal(body.job.status, 'COMPLETED');
    assert.equal(body.job.payload.reportName, 'daily-summary');
  } finally {
    await server.close();
  }
});

test('GET /jobs/:id returns 404 for unknown jobs', async () => {
  const jobService = createMockJobService();
  const app = createApp({ jobService, logger: { error() {} } });
  const server = await startTestServer(app);

  try {
    const response = await fetch(`${server.baseUrl}/jobs/does-not-exist`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error, 'Job not found.');
  } finally {
    await server.close();
  }
});

test('POST /jobs rejects malformed JSON', async () => {
  const jobService = createMockJobService();
  const app = createApp({ jobService, logger: { error() {} } });
  const server = await startTestServer(app);

  try {
    const response = await fetch(`${server.baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: '{"type":',
    });

    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'Invalid JSON payload.');
  } finally {
    await server.close();
  }
});
