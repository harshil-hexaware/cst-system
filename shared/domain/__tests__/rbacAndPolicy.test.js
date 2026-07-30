'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { hasPermission, requirePermission, requireAnyRole, PERMISSIONS } = require('../rbac');
const { validatePassword } = require('../passwordPolicy');
const { pickLeastLoadedAgent } = require('../autoAssign');

test('CUSTOMER can create tickets but cannot assign them', () => {
  assert.equal(hasPermission('CUSTOMER', PERMISSIONS.TICKET_CREATE), true);
  assert.equal(hasPermission('CUSTOMER', PERMISSIONS.TICKET_ASSIGN), false);
});

test('MANAGER can assign tickets and view reports', () => {
  assert.equal(hasPermission('MANAGER', PERMISSIONS.TICKET_ASSIGN), true);
  assert.equal(hasPermission('MANAGER', PERMISSIONS.REPORT_VIEW), true);
});

test('internal ticket notes are restricted to MANAGER and ADMIN only', () => {
  assert.equal(hasPermission('CUSTOMER', PERMISSIONS.TICKET_COMMENT_INTERNAL), false);
  assert.equal(hasPermission('AGENT', PERMISSIONS.TICKET_COMMENT_INTERNAL), false);
  assert.equal(hasPermission('MANAGER', PERMISSIONS.TICKET_COMMENT_INTERNAL), true);
  assert.equal(hasPermission('ADMIN', PERMISSIONS.TICKET_COMMENT_INTERNAL), true);
});

test('ADMIN can manage users and can also assign tickets directly', () => {
  assert.equal(hasPermission('ADMIN', PERMISSIONS.USER_MANAGE), true);
  assert.equal(hasPermission('ADMIN', PERMISSIONS.TICKET_ASSIGN), true);
});

test('attachment upload is available to every role that can touch a ticket, including MANAGER and ADMIN', () => {
  assert.equal(hasPermission('CUSTOMER', PERMISSIONS.TICKET_ATTACHMENT_UPLOAD), true);
  assert.equal(hasPermission('AGENT', PERMISSIONS.TICKET_ATTACHMENT_UPLOAD), true);
  assert.equal(hasPermission('MANAGER', PERMISSIONS.TICKET_ATTACHMENT_UPLOAD), true);
  assert.equal(hasPermission('ADMIN', PERMISSIONS.TICKET_ATTACHMENT_UPLOAD), true);
});

test('requirePermission middleware calls next() when permission present', () => {
  let called = false;
  const req = { user: { role: 'AGENT' } };
  const res = { status: () => ({ json: () => {} }) };
  requirePermission(PERMISSIONS.TICKET_UPDATE_STATUS)(req, res, () => { called = true; });
  assert.equal(called, true);
});

test('requirePermission middleware returns 403 when permission missing', () => {
  let statusCode = null;
  const req = { user: { role: 'CUSTOMER' } };
  const res = {
    status(code) { statusCode = code; return this; },
    json() { return this; },
  };
  requirePermission(PERMISSIONS.TICKET_ASSIGN)(req, res, () => { throw new Error('should not call next'); });
  assert.equal(statusCode, 403);
});

test('validatePassword accepts a strong password', () => {
  const result = validatePassword('Str0ng!Passw0rd');
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('validatePassword rejects a short, all-lowercase password', () => {
  const result = validatePassword('weak');
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test('validatePassword rejects passwords containing whitespace', () => {
  const result = validatePassword('Str0ng! Pass word');
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('Password must not contain whitespace'));
});

test('pickLeastLoadedAgent selects the agent with the smallest workload', () => {
  const agents = [
    { id: 'a1', workloadCount: 5, isActive: true },
    { id: 'a2', workloadCount: 2, isActive: true },
    { id: 'a3', workloadCount: 9, isActive: true },
  ];
  assert.equal(pickLeastLoadedAgent(agents), 'a2');
});

test('pickLeastLoadedAgent ignores inactive agents', () => {
  const agents = [
    { id: 'a1', workloadCount: 0, isActive: false },
    { id: 'a2', workloadCount: 3, isActive: true },
  ];
  assert.equal(pickLeastLoadedAgent(agents), 'a2');
});

test('pickLeastLoadedAgent returns null when no agents available', () => {
  assert.equal(pickLeastLoadedAgent([]), null);
  assert.equal(pickLeastLoadedAgent([{ id: 'a1', workloadCount: 0, isActive: false }]), null);
});

// Regression coverage for a real bug: userRoutes.js imports and calls
// requireAnyRole(['ADMIN','MANAGER']) at route-definition time. If this
// export is ever missing again, that call throws "requireAnyRole is
// not a function" immediately on service boot, crashing the whole
// service. These tests exist specifically to catch that class of bug.
test('requireAnyRole is exported as a function', () => {
  assert.equal(typeof requireAnyRole, 'function');
});

test('requireAnyRole middleware calls next() when the role is in the allow-list', () => {
  let called = false;
  const req = { user: { role: 'MANAGER' } };
  const res = { status: () => ({ json: () => {} }) };
  requireAnyRole(['ADMIN', 'MANAGER'])(req, res, () => { called = true; });
  assert.equal(called, true);
});

test('requireAnyRole middleware returns 403 for a role outside the allow-list', () => {
  let statusCode = null;
  const req = { user: { role: 'CUSTOMER' } };
  const res = {
    status(code) { statusCode = code; return this; },
    json() { return this; },
  };
  requireAnyRole(['ADMIN', 'MANAGER'])(req, res, () => { throw new Error('should not call next'); });
  assert.equal(statusCode, 403);
});
