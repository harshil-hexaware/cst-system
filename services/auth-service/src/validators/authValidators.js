'use strict';

const Joi = require('joi');

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])(?!.*\s).{10,}$/;

const registerSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password: Joi.string().pattern(PASSWORD_PATTERN).required().messages({
    'string.pattern.base': 'Password must be 10+ chars with upper, lower, digit, special char, no spaces',
  }),
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  // NOTE: role is deliberately NOT accepted from the client here.
  // Public self-registration always creates a CUSTOMER; AGENT/MANAGER/
  // ADMIN accounts are only ever created by an existing ADMIN via
  // PATCH /api/users/:userId/role (user-service). Accepting a
  // client-supplied role on this public endpoint would let anyone
  // self-register as ADMIN — a privilege-escalation hole.
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().pattern(PASSWORD_PATTERN).required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().pattern(PASSWORD_PATTERN).required(),
});

module.exports = {
  registerSchema, loginSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema,
};
