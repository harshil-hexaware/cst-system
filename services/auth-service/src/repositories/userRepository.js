'use strict';

const User = require('../models/User');

/**
 * Repository Pattern: all direct model/ORM access for users is
 * isolated here so services never talk to Sequelize directly.
 */
class UserRepository {
  async findByEmail(email) {
    return User.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(id) {
    return User.findByPk(id);
  }

  async create({ email, passwordHash, roleId }) {
    return User.create({ email: email.toLowerCase(), passwordHash, roleId });
  }

  async updateRefreshTokenHash(id, refreshTokenHash) {
    return User.update({ refreshTokenHash }, { where: { id } });
  }

  async updateLastLogin(id) {
    return User.update({ lastLoginAt: new Date() }, { where: { id } });
  }

  async updatePassword(id, passwordHash) {
    return User.update(
      { passwordHash, passwordResetToken: null, passwordResetExpires: null },
      { where: { id } },
    );
  }

  async updateRole(id, roleId) {
    return User.update({ roleId }, { where: { id } });
  }

  async deleteById(id) {
    return User.destroy({ where: { id } });
  }

  async setPasswordResetToken(id, token, expiresAt) {
    return User.update(
      { passwordResetToken: token, passwordResetExpires: expiresAt },
      { where: { id } },
    );
  }

  async findByResetToken(token) {
    const { Op } = require('sequelize');
    return User.findOne({
      where: { passwordResetToken: token, passwordResetExpires: { [Op.gt]: new Date() } },
    });
  }
}

module.exports = new UserRepository();
