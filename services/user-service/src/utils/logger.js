'use strict';
const winston = require('winston');
const SERVICE_NAME = 'user-service';
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, traceId, ...meta }) => JSON.stringify({
    timestamp, service: SERVICE_NAME, traceId: traceId || null, level, message, ...meta,
  })),
);
module.exports = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  transports: [new winston.transports.Console()],
});
