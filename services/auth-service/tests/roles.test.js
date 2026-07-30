'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ROLE_IDS, ROLE_NAMES } = require('../src/domain/roles');

test('every role name maps to an id that maps back to the same name', () => {
  for (const [name, id] of Object.entries(ROLE_IDS)) {
    assert.equal(ROLE_NAMES[id], name);
  }
});

test('CUSTOMER, AGENT, MANAGER, ADMIN are exactly the four defined roles', () => {
  assert.deepEqual(Object.keys(ROLE_IDS).sort(), ['ADMIN', 'AGENT', 'CUSTOMER', 'MANAGER']);
});
