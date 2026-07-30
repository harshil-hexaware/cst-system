'use strict';
require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  serviceName: 'api-gateway',
  jwt: { accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_secret_change_me' },
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:4001',
    user: process.env.USER_SERVICE_URL || 'http://user-service:4002',
    ticket: process.env.TICKET_SERVICE_URL || 'http://ticket-service:4003',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:4004',
  },
  rateLimit: { windowMs: 15 * 60 * 1000, max: 500 },
};
