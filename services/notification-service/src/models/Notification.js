'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Notification extends Model {}

Notification.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
  type: { type: DataTypes.STRING(50), allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  body: DataTypes.TEXT,
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_read' },
  relatedTicketId: { type: DataTypes.UUID, field: 'related_ticket_id' },
}, {
  sequelize, modelName: 'Notification', tableName: 'notifications', underscored: true, updatedAt: false,
});

module.exports = Notification;
