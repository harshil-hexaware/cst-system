'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const Ticket = require('./Ticket');

class TicketHistory extends Model {}

TicketHistory.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ticketId: { type: DataTypes.UUID, allowNull: false, field: 'ticket_id' },
  changedBy: { type: DataTypes.UUID, allowNull: false, field: 'changed_by' },
  fieldChanged: { type: DataTypes.STRING(50), allowNull: false, field: 'field_changed' },
  oldValue: { type: DataTypes.STRING(255), field: 'old_value' },
  newValue: { type: DataTypes.STRING(255), field: 'new_value' },
}, {
  sequelize, modelName: 'TicketHistory', tableName: 'ticket_history', underscored: true, updatedAt: false,
});

Ticket.hasMany(TicketHistory, { foreignKey: 'ticketId', as: 'history' });
TicketHistory.belongsTo(Ticket, { foreignKey: 'ticketId' });

module.exports = TicketHistory;
