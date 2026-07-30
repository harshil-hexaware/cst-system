'use strict';
require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4004', 10),
  serviceName: 'notification-service',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'cst_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  jwt: { accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_secret_change_me' },
  rabbitmq: { url: process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672', exchange: 'cst.events', queue: 'notification-service.events' },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'Support Desk <no-reply@example.com>',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  rateLimit: { windowMs: 15 * 60 * 1000, max: 300 },
};
