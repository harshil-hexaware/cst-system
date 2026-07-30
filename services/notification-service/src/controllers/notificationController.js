'use strict';

const notificationService = require('../services/notificationService');

function ok(data, message = 'OK') {
  return { success: true, message, data };
}

class NotificationController {
  async list(req, res) {
    const result = await notificationService.list(req.user.id, req.query);
    res.status(200).json(ok(result));
  }

  async unreadCount(req, res) {
    const result = await notificationService.unreadCount(req.user.id);
    res.status(200).json(ok(result));
  }

  async markRead(req, res) {
    await notificationService.markRead(req.params.id, req.user.id);
    res.status(200).json(ok(null, 'Marked as read'));
  }

  async markAllRead(req, res) {
    await notificationService.markAllRead(req.user.id);
    res.status(200).json(ok(null, 'All notifications marked as read'));
  }
}

module.exports = new NotificationController();
