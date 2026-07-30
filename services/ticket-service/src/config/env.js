'use strict';
require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4003', 10),
  serviceName: 'ticket-service',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'cst_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  jwt: { accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_secret_change_me' },
  rabbitmq: { url: process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672', exchange: 'cst.events' },
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://user-service:4002',
  rateLimit: { windowMs: 15 * 60 * 1000, max: 300 },
  upload: {
    maxSizeMb: parseInt(process.env.MAX_UPLOAD_MB || '10', 10),
    dir: process.env.UPLOAD_DIR || './uploads',
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'application/zip',
      'application/x-zip-compressed',
    ],
  },
};
