const mongoose = require('mongoose');

function resolveMongoUri(config) {
  if (config.uri) {
    return config.uri;
  }

  const credentials = config.username
    ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password || '')}@`
    : '';

  return `mongodb://${credentials}${config.host}:${config.port}/${config.db}`;
}

async function connectMongoDB(config) {
  const uri = resolveMongoUri(config);

  if (!uri) {
    throw new Error('MongoDB connection URI is missing. Set MONGO_URI or MONGO_HOST/MONGO_PORT/MONGO_DB.');
  }

  await mongoose.connect(uri, {
    dbName: config.db,
  });

  return mongoose.connection;
}

async function closeMongoDB() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}

module.exports = {
  connectMongoDB,
  closeMongoDB,
  resolveMongoUri,
};
