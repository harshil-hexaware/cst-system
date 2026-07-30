'use strict';

const { Router } = require('express');
const { ticketController, categoryController, slaConfigController } = require('../controllers/ticketController');
const authenticate = require('../middleware/authenticate');
const validateRequest = require('../middleware/validateRequest');
const upload = require('../middleware/upload');
const { requirePermission, PERMISSIONS } = require('../domain/rbac');
const {
  createTicketSchema, updateStatusSchema, assignTicketSchema, addCommentSchema, listTicketsQuerySchema,
  createCategorySchema, updateSlaConfigSchema,
} = require('../validators/ticketValidators');

const router = Router();
router.use(authenticate);

// Dashboard summary (role-scoped inside the service layer)
router.get('/dashboard/summary', ticketController.dashboard);

// Categories
router.get('/categories', categoryController.list);
router.post('/categories', requirePermission(PERMISSIONS.CATEGORY_MANAGE), validateRequest(createCategorySchema), categoryController.create);
router.patch('/categories/:id', requirePermission(PERMISSIONS.CATEGORY_MANAGE), categoryController.update);

// SLA configuration (admin-only)
router.get('/sla-config', requirePermission(PERMISSIONS.SLA_CONFIGURE), slaConfigController.list);
router.patch('/sla-config/:priority', requirePermission(PERMISSIONS.SLA_CONFIGURE), validateRequest(updateSlaConfigSchema), slaConfigController.update);

// Tickets
router.post('/', requirePermission(PERMISSIONS.TICKET_CREATE), validateRequest(createTicketSchema), ticketController.create);
router.get('/', validateRequest(listTicketsQuerySchema, 'query'), ticketController.list);
router.get('/:id', ticketController.getById);
// NOTE: authorization for *which* transitions a role may perform is
// enforced inside ticketService.updateStatus() via the state machine's
// assertTransition(), not a blanket permission gate — CUSTOMER, for
// example, is allowed to close/reopen their own RESOLVED ticket but
// not move OPEN -> IN_PROGRESS, which a coarse permission check can't express.
router.patch('/:id/status', validateRequest(updateStatusSchema), ticketController.updateStatus);
router.post('/:id/assign', requirePermission(PERMISSIONS.TICKET_ASSIGN), validateRequest(assignTicketSchema), ticketController.assign);
router.post('/:id/auto-assign', requirePermission(PERMISSIONS.TICKET_ASSIGN), ticketController.autoAssign);

// Comments & attachments
router.post('/:id/comments', validateRequest(addCommentSchema), ticketController.addComment);
router.post('/:id/attachments', requirePermission(PERMISSIONS.TICKET_ATTACHMENT_UPLOAD), upload.single('file'), ticketController.addAttachment);
router.get('/:id/attachments/:attachmentId', ticketController.downloadAttachment);

module.exports = router;
