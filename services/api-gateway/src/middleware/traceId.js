'use strict';
const { randomUUID } = require('crypto');
module.exports = function traceIdMiddleware(req, res, next) {
  req.traceId = req.headers['x-trace-id'] || randomUUID();
  req.headers['x-trace-id'] = req.traceId; // forward to downstream services
  res.setHeader('x-trace-id', req.traceId);
  next();
};
