'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class SlaConfiguration extends Model {}

SlaConfiguration.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  priority: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  responseTimeMins: { type: DataTypes.INTEGER, allowNull: false, field: 'response_time_mins' },
  resolutionTimeMins: { type: DataTypes.INTEGER, allowNull: false, field: 'resolution_time_mins' },
}, {
  sequelize, modelName: 'SlaConfiguration', tableName: 'sla_configurations', underscored: true, timestamps: false,
});

module.exports = SlaConfiguration;
