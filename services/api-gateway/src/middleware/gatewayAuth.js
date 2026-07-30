'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Public paths that never require a token. Everything else gets a
 * cheap signature/expiry check here so malformed/expired tokens are
 * rejected at the edge before even reaching a backend service — pure
 * optimization, NOT the sole authorization boundary. Each downstream
 * service still verifies independently (see authenticate.js in
 * auth-service/user-service/ticket-service) so none of them trust the
 * gateway blindly and each remains safe to call directly in tests or
 * if the gateway is ever bypassed internally.
 */
const PUBLIC_PATHS = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

function isPublic(path) {
  return PUBLIC_PATHS.some((p) => path.startsWith(p)) || path === '/health' || path === '/api-docs';
}

function gatewayAuth(req, res, next) {
  if (isPublic(req.path)) return next();

  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' } });
  }

  try {
    jwt.verify(token, config.jwt.accessSecret);
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' } });
  }
}

module.exports = gatewayAuth;
