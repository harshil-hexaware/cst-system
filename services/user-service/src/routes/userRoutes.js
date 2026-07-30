'use strict';

const { Router } = require('express');
const controller = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const validateRequest = require('../middleware/validateRequest');
const { requirePermission, requireAnyRole, PERMISSIONS } = require('../domain/rbac');
const { updateProfileSchema, updateRoleSchema, listUsersQuerySchema } = require('../validators/userValidators');

const router = Router();

router.use(authenticate);

// Self-service — any authenticated user
router.get('/me', controller.getMe);
router.patch('/me', validateRequest(updateProfileSchema), controller.updateMe);

// Internal/manager use — used by ticket-service's auto-assignment call
router.get('/agents', requirePermission(PERMISSIONS.TICKET_ASSIGN), controller.listAgents);

// User listing — ADMIN (full user management) and MANAGER (needs this
// to find a CUSTOMER to promote to AGENT) can both browse; deactivate/
// activate stay ADMIN-only since that's not a Manager responsibility
// per the role table.
router.get('/', requireAnyRole(['ADMIN', 'MANAGER']), validateRequest(listUsersQuerySchema, 'query'), controller.list);
router.get('/:userId', requireAnyRole(['ADMIN', 'MANAGER']), controller.getById);
router.patch('/:userId/role', requireAnyRole(['ADMIN', 'MANAGER']), validateRequest(updateRoleSchema), controller.changeRole);
router.post('/:userId/deactivate', requirePermission(PERMISSIONS.USER_MANAGE), controller.deactivate);
router.post('/:userId/activate', requirePermission(PERMISSIONS.USER_MANAGE), controller.activate);
router.delete('/:userId', requirePermission(PERMISSIONS.USER_MANAGE), controller.deleteUser);

module.exports = router;
