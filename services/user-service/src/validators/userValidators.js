'use strict';

const Joi = require('joi');

const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(100),
  lastName: Joi.string().min(1).max(100),
  phone: Joi.string().max(30).allow('', null),
  department: Joi.string().max(100).allow('', null),
  avatarUrl: Joi.string().uri().max(500).allow('', null),
}).min(1);

const updateRoleSchema = Joi.object({
  // ADMIN deliberately excluded — admin accounts are bootstrap-only,
  // never assignable through this (or any) API endpoint.
  role: Joi.string().valid('CUSTOMER', 'AGENT', 'MANAGER').required(),
});

const listUsersQuerySchema = Joi.object({
  role: Joi.string().valid('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN'),
  isActive: Joi.boolean(),
  search: Joi.string().max(255),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = { updateProfileSchema, updateRoleSchema, listUsersQuerySchema };
