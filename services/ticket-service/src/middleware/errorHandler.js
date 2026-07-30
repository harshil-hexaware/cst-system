'use strict';
const logger = require('../utils/logger');

class ApiError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  logger.error(err.message, { traceId: req.traceId, stack: err.stack, statusCode });
  res.status(statusCode).json({
    success: false,
    error: { code, message: statusCode === 500 ? 'An unexpected error occurred' : err.message },
    traceId: req.traceId,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}

module.exports = { ApiError, errorHandler, notFoundHandler };
