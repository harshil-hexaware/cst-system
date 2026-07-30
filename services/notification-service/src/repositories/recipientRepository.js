'use strict';

const NotificationRecipient = require('../models/NotificationRecipient');

class RecipientRepository {
  async upsert({
    userId, email, firstName, lastName,
  }) {
    return NotificationRecipient.upsert({
      userId, email, firstName, lastName, updatedAt: new Date(),
    });
  }

  async findByUserId(userId) {
    if (!userId) return null;
    return NotificationRecipient.findByPk(userId);
  }
}

module.exports = new RecipientRepository();
