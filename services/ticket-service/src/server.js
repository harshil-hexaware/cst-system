'use strict';

const app = require('./app');
const config = require('./config/env');
const { connectWithRetry } = require('./config/database');
const { startSlaSweepJob } = require('./jobs/slaSweepJob');
const logger = require('./utils/logger');

async function start() {
  await connectWithRetry();
  startSlaSweepJob();
  const server = app.listen(config.port, () => {
    logger.info(`${config.serviceName} listening on port ${config.port}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error(`Failed to start ${config.serviceName}: ${err.message}`);
  process.exit(1);
});
