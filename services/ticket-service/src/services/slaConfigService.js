'use strict';

const slaConfigRepository = require('../repositories/slaConfigRepository');
const { ApiError } = require('../middleware/errorHandler');

class SlaConfigService {
  async list() {
    return slaConfigRepository.list();
  }

  async update(priority, data) {
    const existing = await slaConfigRepository.findByPriority(priority);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', `No SLA rule configured for priority "${priority}"`);
    return slaConfigRepository.update(priority, data);
  }
}

module.exports = new SlaConfigService();
