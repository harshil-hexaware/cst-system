'use strict';

const { Op } = require('sequelize');
const UserProfile = require('../models/UserProfile');

class UserProfileRepository {
  async create(data) {
    return UserProfile.create(data);
  }

  async findByUserId(userId) {
    return UserProfile.findOne({ where: { userId } });
  }

  async findById(id) {
    return UserProfile.findByPk(id);
  }

  async update(userId, data) {
    await UserProfile.update(data, { where: { userId } });
    return this.findByUserId(userId);
  }

  async deleteByUserId(userId) {
    return UserProfile.destroy({ where: { userId } });
  }

  async list({ role, isActive, search, page = 1, pageSize = 20 }) {
    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { rows, count } = await UserProfile.findAndCountAll({
      where,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [['createdAt', 'DESC']],
    });
    return { rows, count, page, pageSize, totalPages: Math.ceil(count / pageSize) };
  }

  /** Active agents ordered for auto-assignment consideration */
  async listActiveAgents() {
    return UserProfile.findAll({ where: { role: 'AGENT', isActive: true } });
  }

  async incrementWorkload(userId, delta) {
    const profile = await this.findByUserId(userId);
    if (!profile) return null;
    profile.workloadCount = Math.max(0, profile.workloadCount + delta);
    await profile.save();
    return profile;
  }
}

module.exports = new UserProfileRepository();
