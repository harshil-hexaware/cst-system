'use strict';

/**
 * Encodes exactly one rule set, enforced identically everywhere a role
 * gets assigned (direct creation in auth-service, promotion in
 * user-service):
 *   - "ADMIN" can never be assigned/created through any API path,
 *     by anyone — admin accounts exist only via the offline bootstrap
 *     seed script.
 *   - "MANAGER" may only be assigned by an existing ADMIN.
 *   - "AGENT" may be assigned by an ADMIN or a MANAGER.
 *   - "CUSTOMER" (demotion) may only be performed by an ADMIN.
 *
 * @param {string} actorRole - role of the person attempting the assignment
 * @param {string} targetRole - role being assigned
 * @returns {{allowed: boolean, reason: string|null}}
 */
function checkRoleAssignment(actorRole, targetRole) {
  if (targetRole === 'ADMIN') {
    return { allowed: false, reason: 'Admin accounts can only be created via the offline bootstrap script, never through the API' };
  }
  if (targetRole === 'MANAGER' && actorRole !== 'ADMIN') {
    return { allowed: false, reason: 'Only an ADMIN may assign the MANAGER role' };
  }
  if (targetRole === 'AGENT' && !['ADMIN', 'MANAGER'].includes(actorRole)) {
    return { allowed: false, reason: 'Only an ADMIN or MANAGER may assign the AGENT role' };
  }
  if (targetRole === 'CUSTOMER' && actorRole !== 'ADMIN') {
    return { allowed: false, reason: 'Only an ADMIN may demote a user back to CUSTOMER' };
  }
  return { allowed: true, reason: null };
}

module.exports = { checkRoleAssignment };
