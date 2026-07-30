'use strict';

const Category = require('../models/Category');

class CategoryRepository {
  async list(activeOnly = true) {
    return Category.findAll({ where: activeOnly ? { isActive: true } : {}, order: [['name', 'ASC']] });
  }

  async create(data) {
    return Category.create(data);
  }

  async update(id, data) {
    await Category.update(data, { where: { id } });
    return Category.findByPk(id);
  }

  async findById(id) {
    return Category.findByPk(id);
  }
}

module.exports = new CategoryRepository();
