'use strict';

const { Router } = require('express');
const controller = require('../controllers/notificationController');
const authenticate = require('../middleware/authenticate');
const validateRequest = require('../middleware/validateRequest');
const { listNotificationsQuerySchema } = require('../validators/notificationValidators');

const router = Router();
router.use(authenticate);

router.get('/', validateRequest(listNotificationsQuerySchema, 'query'), controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/:id/read', controller.markRead);
router.patch('/read-all', controller.markAllRead);

module.exports = router;
