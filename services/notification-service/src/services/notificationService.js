'use strict';

const notificationRepository = require('../repositories/notificationRepository');
const recipientRepository = require('../repositories/recipientRepository');
const { sendEmail } = require('./mailer');
const templates = require('./templates');
const config = require('../config/env');
const logger = require('../utils/logger');
const { ApiError } = require('../middleware/errorHandler');

class NotificationService {
  // ---------- Event handlers (called by the RabbitMQ consumer) ----------

  async handleUserRegistered(payload, traceId) {
    await recipientRepository.upsert({
      userId: payload.userId,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
    });
    logger.info('Recipient cache updated from user.registered', { traceId, userId: payload.userId });
  }

  async handleTicketCreated(payload, traceId) {
    const tpl = templates.ticketCreated(payload);
    await this._notify(payload.customerId, 'TICKET_CREATED', tpl, payload.ticketId, traceId);
  }

  async handleTicketAssigned(payload, traceId) {
    const tpl = templates.ticketAssigned(payload);
    await this._notify(payload.agentId, 'ASSIGNED', tpl, payload.ticketId, traceId);
  }

  async handleTicketStatusChanged(payload, traceId) {
    const tpl = templates.ticketStatusChanged(payload);
    // Notify the customer always; also notify the assigned agent if the
    // change wasn't made by them (e.g. a manager escalated it).
    if (payload.customerId) {
      await this._notify(payload.customerId, 'STATUS_CHANGED', tpl, payload.ticketId, traceId);
    }
    if (payload.assignedAgentId && payload.assignedAgentId !== payload.changedBy) {
      await this._notify(payload.assignedAgentId, 'STATUS_CHANGED', tpl, payload.ticketId, traceId);
    }
  }

  async handleTicketResolved(payload, traceId) {
    const tpl = templates.ticketResolved(payload);
    await this._notify(payload.customerId, 'RESOLVED', tpl, payload.ticketId, traceId);
  }

  async handleTicketClosed(payload, traceId) {
    const tpl = templates.ticketClosed(payload);
    await this._notify(payload.customerId, 'CLOSED', tpl, payload.ticketId, traceId);
  }

  async handleSlaBreached(payload, traceId) {
    const tpl = templates.slaBreached(payload);
    if (payload.assignedAgentId) {
      await this._notify(payload.assignedAgentId, 'SLA_BREACH', tpl, payload.ticketId, traceId);
    }
  }

  async handleEmailVerificationRequested(payload, traceId) {
    const tpl = templates.emailVerification({ ...payload, frontendUrl: config.frontendUrl });
    await sendEmail({ to: payload.email, subject: tpl.emailSubject, html: tpl.emailHtml }, traceId);
    // No in-app row here — the user has no session yet to see it in.
  }

  async handlePasswordResetRequested(payload, traceId) {
    const tpl = templates.passwordResetRequested({ ...payload, frontendUrl: config.frontendUrl });
    await sendEmail({ to: payload.email, subject: tpl.emailSubject, html: tpl.emailHtml }, traceId);
  }

  // ---------- Internal helper: write in-app row + best-effort email ----------

  async _notify(userId, type, tpl, relatedTicketId, traceId) {
    if (!userId) return;

    await notificationRepository.create({
      userId, type, title: tpl.title, body: tpl.body, relatedTicketId,
    });

    const recipient = await recipientRepository.findByUserId(userId);
    if (recipient) {
      await sendEmail({ to: recipient.email, subject: tpl.emailSubject, html: tpl.emailHtml }, traceId);
    } else {
      logger.warn(`No cached email for user ${userId} — in-app notification created, email skipped`, { traceId });
    }
  }

  // ---------- REST API surface ----------

  async list(userId, query) {
    return notificationRepository.listForUser(userId, query);
  }

  async unreadCount(userId) {
    const count = await notificationRepository.countUnread(userId);
    return { count };
  }

  async markRead(id, userId) {
    const ok = await notificationRepository.markRead(id, userId);
    if (!ok) throw new ApiError(404, 'NOT_FOUND', 'Notification not found');
  }

  async markAllRead(userId) {
    await notificationRepository.markAllRead(userId);
  }
}

module.exports = new NotificationService();
