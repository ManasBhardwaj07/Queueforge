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

test('GET /health returns service health payload', async () => {
  const jobService = createMockJobService();
  const app = createApp({ jobService, logger: { error() {} } });
  const server = await startTestServer(app);

  try {
    const response = await fetch(`${server.baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'queueforge-backend');
    assert.equal(typeof body.timestamp, 'string');
  } finally {
    await server.close();
  }
});

test('GET /security returns active hardening controls', async () => {
  const jobService = createMockJobService();
  const app = createApp({
    jobService,
    logger: { error() {} },
    security: {
      requestBodyLimit: '100kb',
      allowedOrigins: ['http://localhost:5173', 'http://localhost:3001'],
      rateLimitWindowMs: 900000,
      rateLimitMax: 100,
    },
  });
  const server = await startTestServer(app);

  try {
    const response = await fetch(`${server.baseUrl}/security`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.controls.helmet, true);
    assert.equal(body.controls.rateLimit.max, 100);
    assert.equal(body.controls.requestBodyLimit, '100kb');
    assert.equal(Array.isArray(body.controls.cors.allowedOrigins), true);
  } finally {
    await server.close();
  }
});

test('GET /ready returns ready when dependency checks are up', async () => {
  const jobService = createMockJobService();
  const app = createApp({
    jobService,
    logger: { error() {} },
    readinessCheck: async () => ({ mongodb: 'up', redis: 'up' }),
  });
  const server = await startTestServer(app);

  try {
    const response = await fetch(`${server.baseUrl}/ready`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ready');
    assert.equal(body.checks.mongodb, 'up');
    assert.equal(body.checks.redis, 'up');
  } finally {
    await server.close();
  }
});

test('GET /ready returns not-ready when dependency checks fail', async () => {
  const jobService = createMockJobService();
  const app = createApp({
    jobService,
    logger: { error() {} },
    readinessCheck: async () => ({ mongodb: 'up', redis: 'down' }),
  });
  const server = await startTestServer(app);

  try {
    const response = await fetch(`${server.baseUrl}/ready`);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.status, 'not-ready');
    assert.equal(body.checks.mongodb, 'up');
    assert.equal(body.checks.redis, 'down');
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
    assert.equal(body.error.code, 'INVALID_PAYLOAD');
    assert.equal(body.error.message, 'Invalid job request.');
    assert.ok(body.error.details.some((message) => message.includes('recipientEmail')));
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
    assert.equal(body.error.code, 'JOB_NOT_FOUND');
    assert.equal(body.error.message, 'Job not found.');
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
    assert.equal(body.error.code, 'INVALID_JSON');
    assert.equal(body.error.message, 'Invalid JSON payload.');
  } finally {
    await server.close();
  }
});

test('POST /jobs rejects oversized payloads', async () => {
  const jobService = createMockJobService();
  const app = createApp({
    jobService,
    logger: { error() {} },
    security: {
      requestBodyLimit: '200b',
      allowedOrigins: ['http://localhost:5173'],
      rateLimitWindowMs: 60_000,
      rateLimitMax: 100,
    },
  });
  const server = await startTestServer(app);

  try {
    const response = await fetch(`${server.baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        type: 'report',
        payload: {
          reportName: 'a'.repeat(512),
        },
      }),
    });

    const body = await response.json();

    assert.equal(response.status, 413);
    assert.equal(body.error.code, 'PAYLOAD_TOO_LARGE');
  } finally {
    await server.close();
  }
});

test('POST /jobs rejects disallowed CORS origin', async () => {
  const jobService = createMockJobService();
  const app = createApp({
    jobService,
    logger: { error() {} },
    security: {
      requestBodyLimit: '100kb',
      allowedOrigins: ['http://localhost:5173'],
      rateLimitWindowMs: 60_000,
      rateLimitMax: 100,
    },
  });
  const server = await startTestServer(app);

  try {
    const response = await fetch(`${server.baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://evil.example.com',
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

    assert.equal(response.status, 403);
    assert.equal(body.error.code, 'CORS_FORBIDDEN');
  } finally {
    await server.close();
  }
});
