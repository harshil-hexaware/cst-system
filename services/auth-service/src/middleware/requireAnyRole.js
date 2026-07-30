'use strict';

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

module.exports = requireAnyRole;
