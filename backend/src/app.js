const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { validateJobRequest } = require('./validation/jobs');

function buildError(code, message, details) {
  const error = {
    code,
    message,
  };

  if (details !== undefined) {
    error.details = details;
  }

  return {
    error,
  };
}

function createApp({
  jobService,
  logger = console,
  readinessCheck = async () => ({}),
  security = {},
}) {
  const app = express();

  const allowedOrigins = Array.isArray(security.allowedOrigins) ? security.allowedOrigins : [];
  const requestBodyLimit = security.requestBodyLimit || '100kb';
  const rateLimitWindowMs = Number.isInteger(security.rateLimitWindowMs)
    ? security.rateLimitWindowMs
    : 15 * 60 * 1000;
  const rateLimitMax = Number.isInteger(security.rateLimitMax)
    ? security.rateLimitMax
    : 100;

  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS.'));
    },
  }));
  app.use(rateLimit({
    windowMs: rateLimitWindowMs,
    max: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: buildError('RATE_LIMITED', 'Too many requests, please try again later.'),
  }));
  app.use(express.json({ limit: requestBodyLimit }));

  app.get('/health', (req, res) => {
    return res.status(200).json({
      status: 'ok',
      service: 'queueforge-backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/security', (req, res) => {
    return res.status(200).json({
      status: 'ok',
      service: 'queueforge-backend',
      controls: {
        helmet: true,
        rateLimit: {
          enabled: true,
          windowMs: rateLimitWindowMs,
          max: rateLimitMax,
        },
        cors: {
          strategy: 'allow-list',
          allowedOrigins,
        },
        requestBodyLimit,
      },
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', async (req, res) => {
    try {
      const checks = await readinessCheck();
      const allReady = Object.values(checks).every((value) => value === 'up');

      return res.status(allReady ? 200 : 503).json({
        status: allReady ? 'ready' : 'not-ready',
        service: 'queueforge-backend',
        checks,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(error);

      return res.status(503).json({
        status: 'not-ready',
        service: 'queueforge-backend',
        checks: {
          app: 'down',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.post('/jobs', async (req, res, next) => {
    try {
      const validation = validateJobRequest(req.body);

      if (!validation.valid) {
        return res.status(400).json(
          buildError('INVALID_PAYLOAD', 'Invalid job request.', validation.errors),
        );
      }

      const job = await jobService.createJob(validation.value);

      return res.status(201).json({
        message: 'Job queued successfully.',
        job,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/jobs/:id', async (req, res, next) => {
    try {
      const job = await jobService.getJob(req.params.id);

      if (!job) {
        return res.status(404).json(
          buildError('JOB_NOT_FOUND', 'Job not found.'),
        );
      }

      return res.status(200).json({
        job,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use((req, res) => {
    return res.status(404).json(
      buildError('ROUTE_NOT_FOUND', 'Route not found.'),
    );
  });

  app.use((error, req, res, next) => {
    logger.error(error);

    if (error?.message === 'Origin not allowed by CORS.') {
      return res.status(403).json(
        buildError('CORS_FORBIDDEN', 'Request origin is not allowed.'),
      );
    }

    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json(
        buildError('INVALID_JSON', 'Invalid JSON payload.'),
      );
    }

    if (error?.type === 'entity.too.large') {
      return res.status(413).json(
        buildError('PAYLOAD_TOO_LARGE', 'Request payload is too large.'),
      );
    }

    return res.status(500).json(
      buildError('INTERNAL_ERROR', 'Internal server error.'),
    );
  });

  return app;
}

module.exports = {
  createApp,
};
