'use strict';

const Joi = require('joi');
const { STATUSES, PRIORITIES } = require('../domain/ticketStateMachine');

const createTicketSchema = Joi.object({
  subject: Joi.string().min(3).max(255).required(),
  description: Joi.string().min(1).max(10000).required(),
  categoryId: Joi.number().integer().required(),
  priority: Joi.string().valid(...PRIORITIES).default('MEDIUM'),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...STATUSES).required(),
  reason: Joi.string().max(500).allow('', null),
});

const assignTicketSchema = Joi.object({
  agentId: Joi.string().uuid().required(),
});

const addCommentSchema = Joi.object({
  body: Joi.string().min(1).max(5000).required(),
  isInternal: Joi.boolean().default(false),
});

const listTicketsQuerySchema = Joi.object({
  status: Joi.string().valid(...STATUSES),
  priority: Joi.string().valid(...PRIORITIES),
  categoryId: Joi.number().integer(),
  unassigned: Joi.boolean(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(255).allow('', null),
});

const updateSlaConfigSchema = Joi.object({
  responseTimeMins: Joi.number().integer().min(1),
  resolutionTimeMins: Joi.number().integer().min(1),
}).min(1);

module.exports = {
  createTicketSchema,
  updateStatusSchema,
  assignTicketSchema,
  addCommentSchema,
  listTicketsQuerySchema,
  createCategorySchema,
  updateSlaConfigSchema,
};
