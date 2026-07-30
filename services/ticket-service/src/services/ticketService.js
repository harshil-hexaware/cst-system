'use strict';

const ticketRepository = require('../repositories/ticketRepository');
const categoryRepository = require('../repositories/categoryRepository');
const publisher = require('../events/publisher');
const userServiceClient = require('./userServiceClient');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const {
  assertTransition, calculateDueDate, generateTicketNumber, InvalidTransitionError, ForbiddenTransitionError,
} = require('../domain/ticketStateMachine');
const { pickLeastLoadedAgent } = require('../domain/autoAssign');

function mapDomainErrorToApiError(err) {
  if (err instanceof InvalidTransitionError) return new ApiError(400, 'INVALID_TRANSITION', err.message);
  if (err instanceof ForbiddenTransitionError) return new ApiError(403, 'FORBIDDEN_TRANSITION', err.message);
  return err;
}

class TicketService {
  async createTicket({ customerId, subject, description, categoryId, priority }, traceId) {
    const category = await categoryRepository.findById(categoryId);
    if (!category || !category.isActive) {
      throw new ApiError(400, 'INVALID_CATEGORY', 'Category does not exist or is inactive');
    }

    const year = new Date().getFullYear();
    const sequence = (await ticketRepository.countBySequenceThisYear(year)) + 1;
    const ticketNumber = generateTicketNumber(sequence, year);

    const slaRules = await ticketRepository.getSlaRules();
    const createdAt = new Date();
    const dueAt = slaRules.length ? calculateDueDate(createdAt, priority, slaRules) : null;

    const ticket = await ticketRepository.create({
      ticketNumber, subject, description, categoryId, priority, customerId, dueAt, status: 'OPEN',
    });

    await ticketRepository.addHistory({
      ticketId: ticket.id, changedBy: customerId, fieldChanged: 'status', oldValue: null, newValue: 'OPEN',
    });

    await publisher.publish('ticket.created', {
      ticketId: ticket.id, ticketNumber: ticket.ticketNumber, customerId, priority, subject,
    }, traceId);

    logger.info('Ticket created', { traceId, ticketId: ticket.id, ticketNumber });
    return ticket;
  }

  async getTicket(id, requester) {
    const ticket = await ticketRepository.findById(id, { withRelations: true });
    if (!ticket) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found');
    this._assertCanView(ticket, requester);

    // Convert to a plain object before mutating. Reassigning a
    // Sequelize instance's eager-loaded association property directly
    // (e.g. `ticket.comments = ...`) does NOT reliably update what
    // gets serialized to JSON — res.json() calls the model's
    // toJSON(), which reads from the instance's internal dataValues,
    // not from a plain property reassignment. Filtering on a plain
    // object avoids that class of bug entirely. Guarded with
    // typeof-check so this works whether `ticket` is a real Sequelize
    // instance or an already-plain object (e.g. in unit tests).
    const plainTicket = typeof ticket.get === 'function' ? ticket.get({ plain: true }) : ticket;

    // Internal notes are visible to MANAGER and ADMIN only — never to
    // the ticket's own customer, and no longer to agents either.
    const INTERNAL_NOTE_ROLES = ['MANAGER', 'ADMIN'];
    if (!INTERNAL_NOTE_ROLES.includes(requester.role) && plainTicket.comments) {
      plainTicket.comments = plainTicket.comments.filter((c) => !c.isInternal);
    }
    return plainTicket;
  }

  async listTickets(requester, query) {
    return ticketRepository.listForUser({ role: requester.role, userId: requester.id, ...query });
  }

  async updateStatus(id, { status, reason }, requester, traceId) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found');
    this._assertCanView(ticket, requester);

    try {
      assertTransition(ticket.status, status, requester.role);
    } catch (err) {
      throw mapDomainErrorToApiError(err);
    }

    const previousStatus = ticket.status;
    const updates = { status };
    if (status === 'RESOLVED') updates.resolvedAt = new Date();
    if (status === 'CLOSED') updates.closedAt = new Date();
    if (status === 'REOPENED') { updates.resolvedAt = null; updates.closedAt = null; }

    const updated = await ticketRepository.update(id, updates);

    await ticketRepository.addHistory({
      ticketId: id, changedBy: requester.id, fieldChanged: 'status', oldValue: previousStatus, newValue: status,
    });

    await publisher.publish('ticket.status_changed', {
      ticketId: id,
      ticketNumber: ticket.ticketNumber,
      customerId: ticket.customerId,
      assignedAgentId: ticket.assignedAgentId,
      previousStatus,
      newStatus: status,
      reason,
      changedBy: requester.id,
    }, traceId);

    if (status === 'RESOLVED') await publisher.publish('ticket.resolved', { ticketId: id, ticketNumber: ticket.ticketNumber, customerId: ticket.customerId }, traceId);
    if (status === 'CLOSED') await publisher.publish('ticket.closed', { ticketId: id, ticketNumber: ticket.ticketNumber, customerId: ticket.customerId }, traceId);

    logger.info('Ticket status changed', {
      traceId, ticketId: id, previousStatus, newStatus: status,
    });
    return updated;
  }

  /** Manual assignment — manager/admin picks the agent explicitly */
  async assignTicket(id, agentId, requester, traceId) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found');

    const updated = await ticketRepository.update(id, { assignedAgentId: agentId });
    await ticketRepository.addHistory({
      ticketId: id, changedBy: requester.id, fieldChanged: 'assigned_agent_id', oldValue: ticket.assignedAgentId, newValue: agentId,
    });
    await publisher.publish('ticket.assigned', {
      ticketId: id, ticketNumber: ticket.ticketNumber, agentId, assignedBy: requester.id,
    }, traceId);

    logger.info('Ticket manually assigned', { traceId, ticketId: id, agentId });
    return updated;
  }

  /** Auto-assignment — picks the least-loaded active agent via user-service */
  async autoAssignTicket(id, requester, callerAccessToken, traceId) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found');

    const agents = await userServiceClient.fetchActiveAgents(callerAccessToken, traceId);
    const candidateAgents = agents.map((a) => ({ id: a.userId, workloadCount: a.workloadCount, isActive: a.isActive }));
    const agentId = pickLeastLoadedAgent(candidateAgents);

    if (!agentId) throw new ApiError(409, 'NO_AGENTS_AVAILABLE', 'No active agents available for auto-assignment');

    return this.assignTicket(id, agentId, requester, traceId);
  }

  async addComment(ticketId, { body, isInternal }, requester, traceId) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found');
    this._assertCanView(ticket, requester);

    const INTERNAL_NOTE_ROLES = ['MANAGER', 'ADMIN'];
    if (isInternal && !INTERNAL_NOTE_ROLES.includes(requester.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'Only managers and admins can add internal notes');
    }

    const comment = await ticketRepository.addComment({
      ticketId, authorId: requester.id, isInternal: !!isInternal, body,
    });

    await publisher.publish('ticket.comment_added', {
      ticketId, ticketNumber: ticket.ticketNumber, authorId: requester.id, isInternal: !!isInternal,
    }, traceId);

    logger.info('Comment added', { traceId, ticketId, isInternal: !!isInternal });
    return comment;
  }

  async addAttachment(ticketId, file, requester, traceId) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found');
    this._assertCanView(ticket, requester);

    const attachment = await ticketRepository.addAttachment({
      ticketId,
      uploadedBy: requester.id,
      fileName: file.originalname,
      filePath: file.filename,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
    });

    logger.info('Attachment uploaded', { traceId, ticketId, fileName: file.originalname });
    return attachment;
  }

  /**
   * Resolves an attachment for download/preview, enforcing the exact
   * same ownership rules as viewing the ticket itself (a customer can
   * only download attachments on their own tickets, an agent only on
   * tickets assigned to them, manager/admin can download any).
   */
  async getAttachmentFile(ticketId, attachmentId, requester) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) throw new ApiError(404, 'NOT_FOUND', 'Ticket not found');
    this._assertCanView(ticket, requester);

    const attachment = await ticketRepository.findAttachmentById(attachmentId);
    if (!attachment || attachment.ticketId !== ticketId) {
      throw new ApiError(404, 'NOT_FOUND', 'Attachment not found');
    }
    return attachment;
  }

  /** Aggregate counts for Customer / Agent / Admin dashboards */
  async getDashboardSummary(requester) {
    let where = {};
    if (requester.role === 'CUSTOMER') where = { customerId: requester.id };
    else if (requester.role === 'AGENT') where = { assignedAgentId: requester.id };
    // MANAGER / ADMIN see system-wide counts

    const [byStatus, byPriority, breached, avgResolutionHours] = await Promise.all([
      ticketRepository.countByStatus(where),
      ticketRepository.countByPriority(where),
      ticketRepository.countBreached(where),
      ticketRepository.averageResolutionHours(where),
    ]);

    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

    return {
      total,
      open: byStatus.OPEN || 0,
      inProgress: byStatus.IN_PROGRESS || 0,
      onHold: byStatus.ON_HOLD || 0,
      escalated: byStatus.ESCALATED || 0,
      resolved: byStatus.RESOLVED || 0,
      closed: byStatus.CLOSED || 0,
      reopened: byStatus.REOPENED || 0,
      slaBreaches: breached,
      byPriority: {
        LOW: byPriority.LOW || 0,
        MEDIUM: byPriority.MEDIUM || 0,
        HIGH: byPriority.HIGH || 0,
        CRITICAL: byPriority.CRITICAL || 0,
      },
      avgResolutionHours,
    };
  }

  _assertCanView(ticket, requester) {
    if (requester.role === 'CUSTOMER' && ticket.customerId !== requester.id) {
      throw new ApiError(403, 'FORBIDDEN', 'You may only view your own tickets');
    }
    if (requester.role === 'AGENT' && ticket.assignedAgentId !== requester.id) {
      throw new ApiError(403, 'FORBIDDEN', 'You may only view tickets assigned to you');
    }
    // MANAGER / ADMIN can view all tickets
  }
}

module.exports = new TicketService();
