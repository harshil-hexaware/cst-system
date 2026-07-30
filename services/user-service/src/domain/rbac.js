'use strict';

/**
 * Central RBAC permission matrix. Pure module, no external deps.
 * Every service (and the gateway) imports this same source of truth
 * instead of hard-coding role checks in controllers.
 */

const PERMISSIONS = Object.freeze({
  TICKET_CREATE: 'ticket:create',
  TICKET_VIEW_OWN: 'ticket:view:own',
  TICKET_VIEW_ASSIGNED: 'ticket:view:assigned',
  TICKET_VIEW_ALL: 'ticket:view:all',
  TICKET_COMMENT_PUBLIC: 'ticket:comment:public',
  TICKET_COMMENT_INTERNAL: 'ticket:comment:internal',
  TICKET_UPDATE_STATUS: 'ticket:update:status',
  TICKET_ASSIGN: 'ticket:assign',
  TICKET_ATTACHMENT_UPLOAD: 'ticket:attachment:upload',
  USER_MANAGE: 'user:manage',
  ROLE_MANAGE: 'role:manage',
  CATEGORY_MANAGE: 'category:manage',
  SLA_CONFIGURE: 'sla:configure',
  AUDIT_VIEW: 'audit:view',
  REPORT_VIEW: 'report:view',
  SLA_MONITOR: 'sla:monitor',
  AGENT_PERFORMANCE_VIEW: 'agent:performance:view',
});

const ROLE_PERMISSIONS = Object.freeze({
  CUSTOMER: [
    PERMISSIONS.TICKET_CREATE,
    PERMISSIONS.TICKET_VIEW_OWN,
    PERMISSIONS.TICKET_COMMENT_PUBLIC,
    PERMISSIONS.TICKET_ATTACHMENT_UPLOAD,
  ],
  AGENT: [
    PERMISSIONS.TICKET_VIEW_ASSIGNED,
    PERMISSIONS.TICKET_UPDATE_STATUS,
    PERMISSIONS.TICKET_COMMENT_PUBLIC,
    PERMISSIONS.TICKET_ATTACHMENT_UPLOAD,
  ],
  MANAGER: [
    PERMISSIONS.TICKET_VIEW_ALL,
    PERMISSIONS.TICKET_ASSIGN,
    PERMISSIONS.TICKET_UPDATE_STATUS,
    PERMISSIONS.TICKET_COMMENT_PUBLIC,
    PERMISSIONS.TICKET_COMMENT_INTERNAL,
    PERMISSIONS.TICKET_ATTACHMENT_UPLOAD,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.SLA_MONITOR,
    PERMISSIONS.AGENT_PERFORMANCE_VIEW,
  ],
  ADMIN: [
    PERMISSIONS.TICKET_VIEW_ALL,
    PERMISSIONS.TICKET_ASSIGN,
    PERMISSIONS.TICKET_COMMENT_PUBLIC,
    PERMISSIONS.TICKET_COMMENT_INTERNAL,
    PERMISSIONS.TICKET_ATTACHMENT_UPLOAD,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ROLE_MANAGE,
    PERMISSIONS.CATEGORY_MANAGE,
    PERMISSIONS.SLA_CONFIGURE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.REPORT_VIEW,
  ],
});

/**
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

/**
 * Express-style middleware factory (framework-agnostic contract:
 * takes a "req-like" object with req.user.role and calls next()).
 * Kept here so both api-gateway and individual services enforce the
 * exact same rule set.
 */
function requirePermission(permission) {
  return function permissionMiddleware(req, res, next) {
    const role = req.user && req.user.role;
    if (!role || !hasPermission(role, permission)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Missing permission: ${permission}` },
      });
    }
    return next();
  };
}

/**
 * Coarser than requirePermission — gates a route to a fixed allow-list
 * of roles directly (e.g. "ADMIN or MANAGER") rather than a named
 * permission, for endpoints where the exact allowed set doesn't map
 * cleanly to one permission string (e.g. user listing, which both
 * ADMIN and MANAGER need for different reasons).
 */
function requireAnyRole(roles) {
  return function anyRoleMiddleware(req, res, next) {
    const role = req.user && req.user.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `This action requires one of: ${roles.join(', ')}` },
      });
    }
    return next();
  };
}

module.exports = {
  PERMISSIONS, ROLE_PERMISSIONS, hasPermission, requirePermission, requireAnyRole,
};
