'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { ApiError } = require('./errorHandler');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing or malformed Authorization header'));
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.sub, role: decoded.role, email: decoded.email };
    return next();
  } catch (err) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired access token'));
  }
}

module.exports = authenticate;
