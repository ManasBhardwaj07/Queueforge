const express = require('express');
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

function createApp({ jobService, logger = console }) {
  const app = express();

  app.use(express.json());

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

    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json(
        buildError('INVALID_JSON', 'Invalid JSON payload.'),
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
