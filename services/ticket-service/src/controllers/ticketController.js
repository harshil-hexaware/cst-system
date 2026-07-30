'use strict';

const path = require('path');
const ticketService = require('../services/ticketService');
const categoryService = require('../services/categoryService');
const slaConfigService = require('../services/slaConfigService');
const config = require('../config/env');

function ok(data, message = 'OK') {
  return { success: true, message, data };
}

class TicketController {
  async create(req, res) {
    const ticket = await ticketService.createTicket({ customerId: req.user.id, ...req.body }, req.traceId);
    res.status(201).json(ok(ticket, 'Ticket created'));
  }

  async getById(req, res) {
    const ticket = await ticketService.getTicket(req.params.id, req.user);
    res.status(200).json(ok(ticket));
  }

  async list(req, res) {
    const result = await ticketService.listTickets(req.user, req.query);
    res.status(200).json(ok(result));
  }

  async updateStatus(req, res) {
    const ticket = await ticketService.updateStatus(req.params.id, req.body, req.user, req.traceId);
    res.status(200).json(ok(ticket, 'Status updated'));
  }

  async assign(req, res) {
    const ticket = await ticketService.assignTicket(req.params.id, req.body.agentId, req.user, req.traceId);
    res.status(200).json(ok(ticket, 'Ticket assigned'));
  }

  async autoAssign(req, res) {
    const token = (req.headers.authorization || '').split(' ')[1];
    const ticket = await ticketService.autoAssignTicket(req.params.id, req.user, token, req.traceId);
    res.status(200).json(ok(ticket, 'Ticket auto-assigned'));
  }

  async addComment(req, res) {
    const comment = await ticketService.addComment(req.params.id, req.body, req.user, req.traceId);
    res.status(201).json(ok(comment, 'Comment added'));
  }

  async addAttachment(req, res) {
    if (!req.file) {
      return res.status(422).json({ success: false, error: { code: 'NO_FILE', message: 'No file uploaded' } });
    }
    const attachment = await ticketService.addAttachment(req.params.id, req.file, req.user, req.traceId);
    return res.status(201).json(ok(attachment, 'Attachment uploaded'));
  }

  async downloadAttachment(req, res) {
    const attachment = await ticketService.getAttachmentFile(req.params.id, req.params.attachmentId, req.user);
    const absolutePath = path.resolve(config.upload.dir, attachment.filePath);
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName)}"`);
    res.sendFile(absolutePath, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'Stored file could not be located' } });
      }
    });
  }

  async dashboard(req, res) {
    const summary = await ticketService.getDashboardSummary(req.user);
    res.status(200).json(ok(summary));
  }
}

class CategoryController {
  async list(req, res) {
    const includeInactive = req.query.includeInactive === 'true' && req.user.role === 'ADMIN';
    const categories = await categoryService.list(!includeInactive);
    res.status(200).json(ok(categories));
  }

  async create(req, res) {
    const category = await categoryService.create(req.body);
    res.status(201).json(ok(category, 'Category created'));
  }

  async update(req, res) {
    const category = await categoryService.update(req.params.id, req.body);
    res.status(200).json(ok(category, 'Category updated'));
  }
}

class SlaConfigController {
  async list(req, res) {
    const rules = await slaConfigService.list();
    res.status(200).json(ok(rules));
  }

  async update(req, res) {
    const rule = await slaConfigService.update(req.params.priority, req.body);
    res.status(200).json(ok(rule, 'SLA rule updated'));
  }
}

module.exports = {
  ticketController: new TicketController(),
  categoryController: new CategoryController(),
  slaConfigController: new SlaConfigController(),
};
