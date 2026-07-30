'use strict';

const Joi = require('joi');

const listNotificationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  unreadOnly: Joi.boolean().default(false),
});

module.exports = { listNotificationsQuerySchema };
