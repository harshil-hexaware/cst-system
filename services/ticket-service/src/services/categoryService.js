'use strict';

const categoryRepository = require('../repositories/categoryRepository');
const { ApiError } = require('../middleware/errorHandler');

class CategoryService {
  async list(activeOnly = true) {
    return categoryRepository.list(activeOnly);
  }

  async create(data) {
    return categoryRepository.create(data);
  }

  async update(id, data) {
    const existing = await categoryRepository.findById(id);
    if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Category not found');
    return categoryRepository.update(id, data);
  }
}

module.exports = new CategoryService();
