'use strict';

const userProfileRepository = require('../repositories/userProfileRepository');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const publisher = require('../events/publisher');
const { checkRoleAssignment } = require('../domain/roleAssignment');

class UserService {
  async getProfile(userId) {
    const profile = await userProfileRepository.findByUserId(userId);
    if (!profile) throw new ApiError(404, 'NOT_FOUND', 'User profile not found');
    return profile;
  }

  async updateProfile(userId, data, traceId) {
    const existing = await userProfileRepository.findByUserId(userId);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'User profile not found');
    const updated = await userProfileRepository.update(userId, data);
    logger.info('Profile updated', { traceId, userId });
    return updated;
  }

  /**
   * MANAGER is restricted to seeing only AGENT accounts here — not as
   * a UI convenience but enforced server-side, since a Manager has no
   * business reason to browse Customer or Admin accounts. ADMIN sees
   * everyone, with whatever filters they choose.
   */
  async listUsers(actor, query) {
    const effectiveQuery = actor.role === 'MANAGER' ? { ...query, role: 'AGENT' } : query;
    return userProfileRepository.list(effectiveQuery);
  }

  /**
   * Rule set lives in the shared, unit-tested domain/roleAssignment.js
   * (also vendored into auth-service for adminCreateUser — one source
   * of truth for "who can assign which role"). The *route* only checks
   * "is this caller ADMIN or MANAGER at all" (see requireAnyRole in
   * userRoutes.js); this service method checks exactly what that
   * specific actor is allowed to do.
   */
  async changeRole(actor, userId, newRole, traceId) {
    const { allowed, reason } = checkRoleAssignment(actor.role, newRole);
    if (!allowed) {
      throw new ApiError(403, 'FORBIDDEN', reason);
    }

    const existing = await userProfileRepository.findByUserId(userId);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'User profile not found');
    const updated = await userProfileRepository.update(userId, { role: newRole });
    await publisher.publish('user.role_changed', { userId, role: newRole }, traceId);
    logger.info('User role changed', {
      traceId, userId, newRole, actorId: actor.id, actorRole: actor.role,
    });
    return updated;
  }

  async deactivate(userId, traceId) {
    const existing = await userProfileRepository.findByUserId(userId);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'User profile not found');
    const updated = await userProfileRepository.update(userId, { isActive: false });
    logger.info('User deactivated', { traceId, userId });
    return updated;
  }

  async activate(userId, traceId) {
    const existing = await userProfileRepository.findByUserId(userId);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'User profile not found');
    const updated = await userProfileRepository.update(userId, { isActive: true });
    logger.info('User activated', { traceId, userId });
    return updated;
  }

  /**
   * ADMIN-only (enforced at the route via requirePermission(USER_MANAGE)).
   * Deletes the user-service profile immediately, and publishes
   * user.deleted so auth-service removes its own source-of-truth
   * `users` row — mirrors the same event-driven sync pattern already
   * used for user.registered and user.role_changed. Historical
   * tickets/comments/attachments created by this user are left
   * untouched (they reference the user by a plain UUID, not a foreign
   * key) — deleting a user does not erase ticket history.
   */
  async deleteUser(actor, userId, traceId) {
    if (actor.id === userId) {
      throw new ApiError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account');
    }
    const existing = await userProfileRepository.findByUserId(userId);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'User profile not found');

    await userProfileRepository.deleteByUserId(userId);
    await publisher.publish('user.deleted', { userId }, traceId);
    logger.info('User deleted', { traceId, userId, actorId: actor.id });
  }

  async listActiveAgents() {
    return userProfileRepository.listActiveAgents();
  }
}

module.exports = new UserService();
