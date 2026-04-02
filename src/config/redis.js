const IORedis = require('ioredis');

function createRedisConnection(redisConfig) {
  const baseOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  if (redisConfig.url) {
    return new IORedis(redisConfig.url, baseOptions);
  }

  return new IORedis(
    {
      host: redisConfig.host,
      port: redisConfig.port,
      username: redisConfig.username,
      password: redisConfig.password,
      db: redisConfig.db,
    },
    baseOptions,
  );
}

async function closeRedisConnection(connection) {
  if (!connection) {
    return;
  }

  if (typeof connection.quit === 'function') {
    await connection.quit();
    return;
  }

  if (typeof connection.disconnect === 'function') {
    connection.disconnect();
  }
}

module.exports = {
  createRedisConnection,
  closeRedisConnection,
};
