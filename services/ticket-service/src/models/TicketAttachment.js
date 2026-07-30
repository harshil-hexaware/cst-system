'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const Ticket = require('./Ticket');
const TicketComment = require('./TicketComment');

class TicketAttachment extends Model {}

TicketAttachment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ticketId: { type: DataTypes.UUID, allowNull: false, field: 'ticket_id' },
  commentId: { type: DataTypes.UUID, field: 'comment_id' },
  uploadedBy: { type: DataTypes.UUID, allowNull: false, field: 'uploaded_by' },
  fileName: { type: DataTypes.STRING(255), allowNull: false, field: 'file_name' },
  filePath: { type: DataTypes.STRING(500), allowNull: false, field: 'file_path' },
  mimeType: { type: DataTypes.STRING(100), allowNull: false, field: 'mime_type' },
  fileSizeBytes: { type: DataTypes.BIGINT, allowNull: false, field: 'file_size_bytes' },
}, {
  sequelize, modelName: 'TicketAttachment', tableName: 'ticket_attachments', underscored: true, updatedAt: false,
});

Ticket.hasMany(TicketAttachment, { foreignKey: 'ticketId', as: 'attachments' });
TicketAttachment.belongsTo(Ticket, { foreignKey: 'ticketId' });
TicketComment.hasMany(TicketAttachment, { foreignKey: 'commentId', as: 'attachments' });

module.exports = TicketAttachment;
