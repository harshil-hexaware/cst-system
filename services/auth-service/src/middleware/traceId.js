'use strict';

const { randomUUID } = require('crypto');

function traceIdMiddleware(req, res, next) {
  req.traceId = req.headers['x-trace-id'] || randomUUID();
  res.setHeader('x-trace-id', req.traceId);
  next();
}

module.exports = traceIdMiddleware;
