'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const { STATUSES, PRIORITIES } = require('../domain/ticketStateMachine');

class Ticket extends Model {}

Ticket.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ticketNumber: { type: DataTypes.STRING(20), allowNull: false, unique: true, field: 'ticket_number' },
  subject: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  categoryId: { type: DataTypes.INTEGER, field: 'category_id' },
  priority: {
    type: DataTypes.STRING(20), allowNull: false, defaultValue: 'MEDIUM', validate: { isIn: [PRIORITIES] },
  },
  status: {
    type: DataTypes.STRING(20), allowNull: false, defaultValue: 'OPEN', validate: { isIn: [STATUSES] },
  },
  customerId: { type: DataTypes.UUID, allowNull: false, field: 'customer_id' },
  assignedAgentId: { type: DataTypes.UUID, field: 'assigned_agent_id' },
  dueAt: { type: DataTypes.DATE, field: 'due_at' },
  slaBreached: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'sla_breached' },
  resolvedAt: { type: DataTypes.DATE, field: 'resolved_at' },
  closedAt: { type: DataTypes.DATE, field: 'closed_at' },
}, {
  sequelize, modelName: 'Ticket', tableName: 'tickets', underscored: true,
});

module.exports = Ticket;
