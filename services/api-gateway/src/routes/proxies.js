'use strict';

const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config/env');
const logger = require('../utils/logger');

function proxyLogger(serviceName) {
  return (proxyReq, req) => {
    proxyReq.setHeader('x-trace-id', req.traceId);
    logger.info(`Proxying ${req.method} ${req.originalUrl} -> ${serviceName}`, { traceId: req.traceId });
  };
}

function errorHandler(serviceName) {
  return (err, req, res) => {
    logger.error(`Proxy error to ${serviceName}: ${err.message}`, { traceId: req.traceId });
    res.status(502).json({
      success: false,
      error: { code: 'BAD_GATEWAY', message: `${serviceName} is currently unavailable` },
    });
  };
}

const authProxy = createProxyMiddleware({
  target: config.services.auth,
  changeOrigin: true,
  onProxyReq: proxyLogger('auth-service'),
  onError: errorHandler('auth-service'),
});

const userProxy = createProxyMiddleware({
  target: config.services.user,
  changeOrigin: true,
  onProxyReq: proxyLogger('user-service'),
  onError: errorHandler('user-service'),
});

const ticketProxy = createProxyMiddleware({
  target: config.services.ticket,
  changeOrigin: true,
  onProxyReq: proxyLogger('ticket-service'),
  onError: errorHandler('ticket-service'),
});

const notificationProxy = createProxyMiddleware({
  target: config.services.notification,
  changeOrigin: true,
  onProxyReq: proxyLogger('notification-service'),
  onError: errorHandler('notification-service'),
});

module.exports = {
  authProxy, userProxy, ticketProxy, notificationProxy,
};
