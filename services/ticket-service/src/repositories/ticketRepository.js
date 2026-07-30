'use strict';

const { Op, fn, col, literal } = require('sequelize');
const Ticket = require('../models/Ticket');
const TicketComment = require('../models/TicketComment');
const TicketAttachment = require('../models/TicketAttachment');
const TicketHistory = require('../models/TicketHistory');
const SlaConfiguration = require('../models/SlaConfiguration');

class TicketRepository {
  async create(data) {
    return Ticket.create(data);
  }

  async findById(id, { withRelations = false } = {}) {
    if (!withRelations) return Ticket.findByPk(id);
    return Ticket.findByPk(id, {
      include: [
        { model: TicketComment, as: 'comments', order: [['createdAt', 'ASC']] },
        { model: TicketAttachment, as: 'attachments' },
        { model: TicketHistory, as: 'history', order: [['createdAt', 'DESC']] },
      ],
    });
  }

  async update(id, data) {
    await Ticket.update(data, { where: { id } });
    return this.findById(id);
  }

  /**
   * Role-scoped listing: customers see only their own tickets, agents
   * see only tickets assigned to them, managers/admins see everything
   * (with optional filters). Scoping happens here, not just at the
   * route layer, so a bug in the controller can never leak data.
   */
  async listForUser({
    role, userId, status, priority, categoryId, unassigned, page = 1, pageSize = 20,
  }) {
    const where = {};
    if (role === 'CUSTOMER') where.customerId = userId;
    else if (role === 'AGENT') where.assignedAgentId = userId;
    // MANAGER / ADMIN: no ownership filter — see all tickets

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (unassigned) where.assignedAgentId = null;

    const { rows, count } = await Ticket.findAndCountAll({
      where,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [['createdAt', 'DESC']],
    });
    return { rows, count, page, pageSize, totalPages: Math.ceil(count / pageSize) };
  }

  async countBySequenceThisYear(year) {
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00Z`);
    return Ticket.count({ where: { createdAt: { [Op.gte]: start, [Op.lt]: end } } });
  }

  async addComment(data) {
    return TicketComment.create(data);
  }

  async addAttachment(data) {
    return TicketAttachment.create(data);
  }

  async findAttachmentById(attachmentId) {
    return TicketAttachment.findByPk(attachmentId);
  }

  async addHistory(data) {
    return TicketHistory.create(data);
  }

  async getSlaRules() {
    const rows = await SlaConfiguration.findAll();
    return rows.map((r) => ({
      priority: r.priority,
      responseTimeMins: r.responseTimeMins,
      resolutionTimeMins: r.resolutionTimeMins,
    }));
  }

  /** Dashboard aggregate counts, scoped by role in the service layer's `where` */
  async countByStatus(where) {
    const rows = await Ticket.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      where,
      group: ['status'],
      raw: true,
    });
    return rows.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.count, 10) }), {});
  }

  async countByPriority(where) {
    const rows = await Ticket.findAll({
      attributes: ['priority', [fn('COUNT', col('id')), 'count']],
      where,
      group: ['priority'],
      raw: true,
    });
    return rows.reduce((acc, r) => ({ ...acc, [r.priority]: parseInt(r.count, 10) }), {});
  }

  /** Average hours from creation to resolution, for resolved/closed tickets in scope */
  async averageResolutionHours(where) {
    const row = await Ticket.findOne({
      attributes: [[
        fn('AVG', fn('EXTRACT', literal('EPOCH FROM (resolved_at - created_at)'))),
        'avgSeconds',
      ]],
      where: { ...where, resolvedAt: { [Op.ne]: null } },
      raw: true,
    });
    const avgSeconds = row && row.avgSeconds ? parseFloat(row.avgSeconds) : null;
    return avgSeconds ? Math.round((avgSeconds / 3600) * 10) / 10 : null;
  }

  async countBreached(where) {
    return Ticket.count({ where: { ...where, slaBreached: true } });
  }

  /** Tickets past their due date, not yet resolved/closed, and not already flagged — for the SLA sweep job */
  async findNewlyBreached() {
    return Ticket.findAll({
      where: {
        dueAt: { [Op.lt]: new Date() },
        slaBreached: false,
        status: { [Op.notIn]: ['RESOLVED', 'CLOSED'] },
      },
    });
  }

  async markBreached(id) {
    return Ticket.update({ slaBreached: true }, { where: { id } });
  }
}

module.exports = new TicketRepository();
