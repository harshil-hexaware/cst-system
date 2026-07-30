'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const Ticket = require('./Ticket');

class TicketComment extends Model {}

TicketComment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ticketId: { type: DataTypes.UUID, allowNull: false, field: 'ticket_id' },
  authorId: { type: DataTypes.UUID, allowNull: false, field: 'author_id' },
  isInternal: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_internal' },
  body: { type: DataTypes.TEXT, allowNull: false },
}, {
  sequelize, modelName: 'TicketComment', tableName: 'ticket_comments', underscored: true, updatedAt: false,
});

Ticket.hasMany(TicketComment, { foreignKey: 'ticketId', as: 'comments' });
TicketComment.belongsTo(Ticket, { foreignKey: 'ticketId' });

module.exports = TicketComment;
