'use strict';

const authService = require('../services/authService');

function structuredResponse(data, message = 'OK') {
  return { success: true, message, data };
}

class AuthController {
  async register(req, res) {
    const user = await authService.register(req.body, req.traceId);
    res.status(201).json(structuredResponse(user, 'User registered successfully'));
  }

  async login(req, res) {
    const result = await authService.login(req.body, req.traceId);
    res.status(200).json(structuredResponse(result, 'Login successful'));
  }

  async refresh(req, res) {
    const result = await authService.refresh(req.body, req.traceId);
    res.status(200).json(structuredResponse(result, 'Token refreshed'));
  }

  async logout(req, res) {
    await authService.logout(req.user.id, req.traceId);
    res.status(200).json(structuredResponse(null, 'Logged out'));
  }

  async forgotPassword(req, res) {
    await authService.forgotPassword(req.body, req.traceId);
    res.status(200).json(structuredResponse(null, 'If that email exists, a reset link has been sent'));
  }

  async resetPassword(req, res) {
    await authService.resetPassword(req.body, req.traceId);
    res.status(200).json(structuredResponse(null, 'Password reset successful'));
  }

  async changePassword(req, res) {
    await authService.changePassword(req.user.id, req.body, req.traceId);
    res.status(200).json(structuredResponse(null, 'Password changed successfully'));
  }
}

module.exports = new AuthController();
