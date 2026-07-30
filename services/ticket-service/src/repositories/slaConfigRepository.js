'use strict';

const SlaConfiguration = require('../models/SlaConfiguration');

class SlaConfigRepository {
  async list() {
    return SlaConfiguration.findAll({ order: [['priority', 'ASC']] });
  }

  async findByPriority(priority) {
    return SlaConfiguration.findOne({ where: { priority } });
  }

  async update(priority, data) {
    await SlaConfiguration.update(data, { where: { priority } });
    return this.findByPriority(priority);
  }
}

module.exports = new SlaConfigRepository();
