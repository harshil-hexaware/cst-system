'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { ApiError } = require('../middleware/errorHandler');
const config = require('../config/env');
const publisher = require('../events/publisher');
const logger = require('../utils/logger');
const { ROLE_IDS, ROLE_NAMES } = require('../domain/roles');

class AuthService {
  async register({ email, password, firstName, lastName, role }, traceId) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
    const roleId = ROLE_IDS[role] || ROLE_IDS.CUSTOMER;
    const user = await userRepository.create({ email, passwordHash, roleId });

    // Event-driven communication: user-service consumes this to create
    // the profile row; decouples auth-service from user-service schema.
    await publisher.publish('user.registered', {
      userId: user.id,
      email: user.email,
      role: ROLE_NAMES[roleId],
      firstName,
      lastName,
    }, traceId);

    logger.info('User registered', { traceId, userId: user.id });
    return { ...user.toSafeJSON(), role: ROLE_NAMES[roleId] };
  }

  async login({ email, password }, traceId) {
    const user = await userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const roleName = ROLE_NAMES[user.roleId];
    const accessToken = signAccessToken({ sub: user.id, role: roleName, email: user.email });
    const refreshToken = signRefreshToken({ sub: user.id });

    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await userRepository.updateRefreshTokenHash(user.id, refreshTokenHash);
    await userRepository.updateLastLogin(user.id);

    logger.info('User logged in', { traceId, userId: user.id });
    return { accessToken, refreshToken, user: { ...user.toSafeJSON(), role: roleName } };
  }

  async refresh({ refreshToken }, traceId) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
    }

    const user = await userRepository.findById(decoded.sub);
    if (!user || !user.isActive) {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'User no longer active');
    }

    const suppliedHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    if (suppliedHash !== user.refreshTokenHash) {
      throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token has been revoked');
    }

    const roleName = ROLE_NAMES[user.roleId];
    const accessToken = signAccessToken({ sub: user.id, role: roleName, email: user.email });
    logger.info('Access token refreshed', { traceId, userId: user.id });
    return { accessToken };
  }

  async logout(userId, traceId) {
    await userRepository.updateRefreshTokenHash(userId, null);
    logger.info('User logged out', { traceId, userId });
  }

  async forgotPassword({ email }, traceId) {
    const user = await userRepository.findByEmail(email);
    // Always respond success to avoid user enumeration, even if not found.
    if (!user) {
      logger.info('Password reset requested for unknown email (no-op)', { traceId });
      return;
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await userRepository.setPasswordResetToken(user.id, token, expiresAt);

    await publisher.publish('user.password_reset_requested', {
      userId: user.id, email: user.email, resetToken: token,
    }, traceId);

    logger.info('Password reset token issued', { traceId, userId: user.id });
  }

  async resetPassword({ token, newPassword }, traceId) {
    const user = await userRepository.findByResetToken(token);
    if (!user) {
      throw new ApiError(400, 'INVALID_RESET_TOKEN', 'Reset token is invalid or expired');
    }
    const passwordHash = await bcrypt.hash(newPassword, config.bcryptSaltRounds);
    await userRepository.updatePassword(user.id, passwordHash);
    await userRepository.updateRefreshTokenHash(user.id, null); // force re-login everywhere
    logger.info('Password reset completed', { traceId, userId: user.id });
  }

  async changePassword(userId, { currentPassword, newPassword }, traceId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, config.bcryptSaltRounds);
    await userRepository.updatePassword(userId, passwordHash);
    logger.info('Password changed', { traceId, userId });
  }
}

module.exports = new AuthService();
