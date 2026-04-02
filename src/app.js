const express = require('express');
const { validateJobRequest } = require('./validation/jobs');

function createApp({ jobService, logger = console }) {
  const app = express();

  app.use(express.json());

  app.post('/jobs', async (req, res, next) => {
    try {
      const validation = validateJobRequest(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid job request.',
          details: validation.errors,
        });
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
        return res.status(404).json({
          error: 'Job not found.',
        });
      }

      return res.status(200).json({
        job,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use((req, res) => {
    return res.status(404).json({
      error: 'Route not found.',
    });
  });

  app.use((error, req, res, next) => {
    logger.error(error);

    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({
        error: 'Invalid JSON payload.',
      });
    }

    return res.status(500).json({
      error: 'Internal server error.',
    });
  });

  return app;
}

module.exports = {
  createApp,
};
