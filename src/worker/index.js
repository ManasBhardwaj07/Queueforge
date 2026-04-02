const { Worker } = require('bullmq');
const { createJobProcessor } = require('./jobProcessor');

function createQueueWorker({ queueName, connection, logger = console, concurrency = 1, baseDelayMs = 300 }) {
  const processor = createJobProcessor({ logger, baseDelayMs });

  return new Worker(queueName, processor, {
    connection,
    concurrency,
  });
}

module.exports = {
  createQueueWorker,
};
