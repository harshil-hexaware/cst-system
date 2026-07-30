'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { checkRoleAssignment } = require('../roleAssignment');

test('ADMIN target is rejected regardless of actor, even another ADMIN', () => {
  assert.equal(checkRoleAssignment('ADMIN', 'ADMIN').allowed, false);
  assert.equal(checkRoleAssignment('CUSTOMER', 'ADMIN').allowed, false);
});

test('MANAGER target requires an ADMIN actor', () => {
  assert.equal(checkRoleAssignment('ADMIN', 'MANAGER').allowed, true);
  assert.equal(checkRoleAssignment('MANAGER', 'MANAGER').allowed, false);
  assert.equal(checkRoleAssignment('AGENT', 'MANAGER').allowed, false);
});

test('AGENT target allowed for ADMIN or MANAGER actors, nobody else', () => {
  assert.equal(checkRoleAssignment('ADMIN', 'AGENT').allowed, true);
  assert.equal(checkRoleAssignment('MANAGER', 'AGENT').allowed, true);
  assert.equal(checkRoleAssignment('AGENT', 'AGENT').allowed, false);
  assert.equal(checkRoleAssignment('CUSTOMER', 'AGENT').allowed, false);
});

test('CUSTOMER (demotion) target requires an ADMIN actor', () => {
  assert.equal(checkRoleAssignment('ADMIN', 'CUSTOMER').allowed, true);
  assert.equal(checkRoleAssignment('MANAGER', 'CUSTOMER').allowed, false);
});

test('every disallowed case carries a human-readable reason', () => {
  const result = checkRoleAssignment('MANAGER', 'MANAGER');
  assert.equal(result.allowed, false);
  assert.equal(typeof result.reason, 'string');
  assert.ok(result.reason.length > 0);
});
