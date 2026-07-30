'use strict';
require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4002', 10),
  serviceName: 'user-service',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'cst_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  jwt: { accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_secret_change_me' },
  rabbitmq: { url: process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672', exchange: 'cst.events', queue: 'user-service.events' },
  rateLimit: { windowMs: 15 * 60 * 1000, max: 200 },
};
