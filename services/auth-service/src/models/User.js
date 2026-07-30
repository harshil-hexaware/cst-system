'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class User extends Model {
  toSafeJSON() {
    const { id, email, roleId, isActive, lastLoginAt, createdAt } = this;
    return { id, email, roleId, isActive, lastLoginAt, createdAt };
  }
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash',
  },
  roleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'role_id',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  refreshTokenHash: {
    type: DataTypes.STRING(255),
    field: 'refresh_token_hash',
  },
  passwordResetToken: {
    type: DataTypes.STRING(255),
    field: 'password_reset_token',
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    field: 'password_reset_expires',
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    field: 'last_login_at',
  },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  underscored: true,
});

module.exports = User;
