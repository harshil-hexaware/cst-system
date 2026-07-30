'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class NotificationRecipient extends Model {}

NotificationRecipient.init({
  userId: {
    type: DataTypes.UUID, primaryKey: true, field: 'user_id',
  },
  email: { type: DataTypes.STRING(255), allowNull: false },
  firstName: { type: DataTypes.STRING(100), field: 'first_name' },
  lastName: { type: DataTypes.STRING(100), field: 'last_name' },
}, {
  sequelize, modelName: 'NotificationRecipient', tableName: 'notification_recipients', underscored: true, createdAt: false,
});

module.exports = NotificationRecipient;
