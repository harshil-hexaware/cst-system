'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class UserProfile extends Model {}

UserProfile.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'user_id',
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { isIn: [['CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN']] },
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name',
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name',
  },
  phone: DataTypes.STRING(30),
  department: DataTypes.STRING(100),
  avatarUrl: {
    type: DataTypes.STRING(500),
    field: 'avatar_url',
  },
  workloadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'workload_count',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  sequelize,
  modelName: 'UserProfile',
  tableName: 'user_profiles',
  underscored: true,
});

module.exports = UserProfile;
