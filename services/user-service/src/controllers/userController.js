'use strict';

const userService = require('../services/userService');

function ok(data, message = 'OK') {
  return { success: true, message, data };
}

class UserController {
  async getMe(req, res) {
    const profile = await userService.getProfile(req.user.id);
    res.status(200).json(ok(profile));
  }

  async updateMe(req, res) {
    const profile = await userService.updateProfile(req.user.id, req.body, req.traceId);
    res.status(200).json(ok(profile, 'Profile updated'));
  }

  async getById(req, res) {
    const profile = await userService.getProfile(req.params.userId);
    res.status(200).json(ok(profile));
  }

  async list(req, res) {
    const result = await userService.listUsers(req.user, req.query);
    res.status(200).json(ok(result));
  }

  async changeRole(req, res) {
    const profile = await userService.changeRole(req.user, req.params.userId, req.body.role, req.traceId);
    res.status(200).json(ok(profile, 'Role updated'));
  }

  async deactivate(req, res) {
    const profile = await userService.deactivate(req.params.userId, req.traceId);
    res.status(200).json(ok(profile, 'User deactivated'));
  }

  async activate(req, res) {
    const profile = await userService.activate(req.params.userId, req.traceId);
    res.status(200).json(ok(profile, 'User activated'));
  }

  async deleteUser(req, res) {
    await userService.deleteUser(req.user, req.params.userId, req.traceId);
    res.status(200).json(ok(null, 'User deleted'));
  }

  async listAgents(req, res) {
    const agents = await userService.listActiveAgents();
    res.status(200).json(ok(agents));
  }
}

module.exports = new UserController();
