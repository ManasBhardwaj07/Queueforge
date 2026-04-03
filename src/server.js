require('dotenv').config();

const http = require('http');
const { createApp } = require('./app');
const { loadEnv, validateEnv } = require('./config/env');
const { createRedisConnection, closeRedisConnection } = require('./config/redis');
const { connectMongoDB, closeMongoDB } = require('./config/mongodb');
const { createJobService } = require('./services/jobService');

async function startServer() {
  const env = validateEnv(loadEnv());
  await connectMongoDB(env.mongodb);
  const connection = createRedisConnection(env.redis);
  const jobService = createJobService({
    queueName: env.queueName,
    connection,
    retryConfig: env.retry,
  });
  const app = createApp({ jobService });
  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(env.port, resolve);
  });

  console.log(`API listening on port ${env.port}`);

  async function shutdown(signal) {
    console.log(`Received ${signal}, shutting down API...`);
    server.close(async () => {
      await jobService.close();
      await closeRedisConnection(connection);
      await closeMongoDB();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });

  return { server, jobService, connection };
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  startServer,
};
