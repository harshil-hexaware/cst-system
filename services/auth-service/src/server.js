'use strict';

const app = require('./app');
const config = require('./config/env');
const { connectWithRetry } = require('./config/database');
const { startConsumer } = require('./events/consumer');
const logger = require('./utils/logger');

async function start() {
  await connectWithRetry();
  startConsumer(); // fire-and-forget; retries internally, never blocks HTTP startup

  const server = app.listen(config.port, () => {
    logger.info(`${config.serviceName} listening on port ${config.port}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error(`Failed to start ${config.serviceName}: ${err.message}`);
  process.exit(1);
});
