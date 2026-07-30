'use strict';

const Notification = require('../models/Notification');

class NotificationRepository {
  async create(data) {
    return Notification.create(data);
  }

  async listForUser(userId, { page = 1, pageSize = 20, unreadOnly = false } = {}) {
    const where = { userId };
    if (unreadOnly) where.isRead = false;
    const { rows, count } = await Notification.findAndCountAll({
      where,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [['createdAt', 'DESC']],
    });
    return {
      rows, count, page, pageSize, totalPages: Math.ceil(count / pageSize),
    };
  }

  async countUnread(userId) {
    return Notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id, userId) {
    const [affected] = await Notification.update(
      { isRead: true },
      { where: { id, userId } },
    );
    return affected > 0;
  }

  async markAllRead(userId) {
    return Notification.update({ isRead: true }, { where: { userId, isRead: false } });
  }
}

module.exports = new NotificationRepository();
