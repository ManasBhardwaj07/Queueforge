require('dotenv').config();

const { loadEnv, validateEnv } = require('./config/env');
const { createRedisConnection, closeRedisConnection } = require('./config/redis');
const { connectMongoDB, closeMongoDB } = require('./config/mongodb');
const { createQueueWorker } = require('./worker/index');

async function startWorker() {
  const env = validateEnv(loadEnv());
  await connectMongoDB(env.mongodb);
  const connection = createRedisConnection(env.redis);
  const worker = createQueueWorker({
    queueName: env.queueName,
    connection,
    concurrency: env.workerConcurrency,
    baseDelayMs: env.jobProcessingDelayMs,
    staleActiveThresholdMs: env.reliability.staleActiveThresholdMs,
    dlq: env.dlq,
  });

  console.log(`Worker listening on queue ${env.queueName}`);

  async function shutdown(signal) {
    console.log(`Received ${signal}, shutting down worker...`);
    await worker.close();
    await closeRedisConnection(connection);
    await closeMongoDB();
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
