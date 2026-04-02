require('dotenv').config();

const { loadEnv } = require('./config/env');
const { createRedisConnection, closeRedisConnection } = require('./config/redis');
const { createQueueWorker } = require('./worker/index');

async function startWorker() {
  const env = loadEnv();
  const connection = createRedisConnection(env.redis);
  const worker = createQueueWorker({
    queueName: env.queueName,
    connection,
    concurrency: env.workerConcurrency,
    baseDelayMs: env.jobProcessingDelayMs,
  });

  worker.on('completed', (job) => {
    console.log(`Worker completed job ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Worker failed job ${job?.id || 'unknown'}: ${error.message}`);
  });

  console.log(`Worker listening on queue ${env.queueName}`);

  async function shutdown(signal) {
    console.log(`Received ${signal}, shutting down worker...`);
    await worker.close();
    await closeRedisConnection(connection);
    process.exit(0);
  }

  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });

  return { worker, connection };
}

if (require.main === module) {
  startWorker().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  startWorker,
};
