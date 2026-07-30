'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canTransition,
  assertTransition,
  calculateDueDate,
  isBreached,
  generateTicketNumber,
  InvalidTransitionError,
  ForbiddenTransitionError,
} = require('../ticketStateMachine');

test('OPEN -> IN_PROGRESS is a valid structural transition', () => {
  assert.equal(canTransition('OPEN', 'IN_PROGRESS'), true);
});

test('CLOSED -> IN_PROGRESS is not a valid structural transition (must reopen first)', () => {
  assert.equal(canTransition('CLOSED', 'IN_PROGRESS'), false);
});

test('assertTransition allows AGENT to move OPEN -> IN_PROGRESS', () => {
  assert.equal(assertTransition('OPEN', 'IN_PROGRESS', 'AGENT'), true);
});

test('assertTransition rejects CUSTOMER moving OPEN -> IN_PROGRESS', () => {
  assert.throws(() => assertTransition('OPEN', 'IN_PROGRESS', 'CUSTOMER'), ForbiddenTransitionError);
});

test('assertTransition rejects an unknown status value', () => {
  assert.throws(() => assertTransition('OPEN', 'DELETED', 'ADMIN'), InvalidTransitionError);
});

test('assertTransition allows CUSTOMER to reopen a CLOSED ticket', () => {
  assert.equal(assertTransition('CLOSED', 'REOPENED', 'CUSTOMER'), true);
});

test('assertTransition rejects AGENT closing directly from OPEN (manager/admin only)', () => {
  assert.throws(() => assertTransition('OPEN', 'CLOSED', 'AGENT'), ForbiddenTransitionError);
});

test('calculateDueDate adds the configured resolution window', () => {
  const created = new Date('2026-07-11T09:00:00Z');
  const rules = [{ priority: 'HIGH', resolutionTimeMins: 480 }];
  const due = calculateDueDate(created, 'HIGH', rules);
  assert.equal(due.toISOString(), '2026-07-11T17:00:00.000Z');
});

test('calculateDueDate throws for a priority with no configured rule', () => {
  assert.throws(() => calculateDueDate(new Date(), 'CRITICAL', []));
});

test('isBreached is true once now passes dueAt on an open ticket', () => {
  const due = new Date('2026-07-11T10:00:00Z');
  const now = new Date('2026-07-11T10:00:01Z');
  assert.equal(isBreached(now, due, 'IN_PROGRESS'), true);
});

test('isBreached is false for a RESOLVED ticket even past due date', () => {
  const due = new Date('2026-07-11T10:00:00Z');
  const now = new Date('2026-07-11T12:00:00Z');
  assert.equal(isBreached(now, due, 'RESOLVED'), false);
});

test('generateTicketNumber pads sequence to 6 digits and scopes by year', () => {
  assert.equal(generateTicketNumber(123, 2026), 'TCK-2026-000123');
});

test('generateTicketNumber rejects non-positive sequence', () => {
  assert.throws(() => generateTicketNumber(0, 2026));
});
