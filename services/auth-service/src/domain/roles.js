'use strict';

const ROLE_IDS = Object.freeze({
  CUSTOMER: 1, AGENT: 2, MANAGER: 3, ADMIN: 4,
});

const ROLE_NAMES = Object.freeze({
  1: 'CUSTOMER', 2: 'AGENT', 3: 'MANAGER', 4: 'ADMIN',
});

module.exports = { ROLE_IDS, ROLE_NAMES };
