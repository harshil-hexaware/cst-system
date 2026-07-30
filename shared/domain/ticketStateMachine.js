'use strict';

/**
 * Ticket status workflow state machine.
 * Pure module — zero external dependencies — so it can be unit
 * tested directly and imported unchanged by ticket-service.
 */

const STATUSES = Object.freeze([
  'OPEN', 'IN_PROGRESS', 'ON_HOLD', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED',
]);

const PRIORITIES = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

const ROLES = Object.freeze(['CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN']);

// Allowed transitions: fromStatus -> [toStatus...]
const TRANSITIONS = Object.freeze({
  OPEN: ['IN_PROGRESS', 'ESCALATED', 'CLOSED'],
  IN_PROGRESS: ['ON_HOLD', 'ESCALATED', 'RESOLVED', 'CLOSED'],
  ON_HOLD: ['IN_PROGRESS', 'ESCALATED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'ESCALATED', 'CLOSED'],
});

// Which roles may *initiate* each transition (independent of who owns the ticket)
const TRANSITION_ROLES = Object.freeze({
  'OPEN->IN_PROGRESS': ['AGENT', 'MANAGER', 'ADMIN'],
  'OPEN->ESCALATED': ['AGENT', 'MANAGER', 'ADMIN'],
  'OPEN->CLOSED': ['MANAGER', 'ADMIN'],
  'IN_PROGRESS->ON_HOLD': ['AGENT', 'MANAGER', 'ADMIN'],
  'IN_PROGRESS->ESCALATED': ['AGENT', 'MANAGER', 'ADMIN'],
  'IN_PROGRESS->RESOLVED': ['AGENT', 'MANAGER', 'ADMIN'],
  'IN_PROGRESS->CLOSED': ['MANAGER', 'ADMIN'],
  'ON_HOLD->IN_PROGRESS': ['AGENT', 'MANAGER', 'ADMIN'],
  'ON_HOLD->ESCALATED': ['AGENT', 'MANAGER', 'ADMIN'],
  'ON_HOLD->CLOSED': ['MANAGER', 'ADMIN'],
  'ESCALATED->IN_PROGRESS': ['MANAGER', 'ADMIN'],
  'ESCALATED->RESOLVED': ['MANAGER', 'ADMIN'],
  'ESCALATED->CLOSED': ['MANAGER', 'ADMIN'],
  'RESOLVED->CLOSED': ['CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN'],
  'RESOLVED->REOPENED': ['CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN'],
  'CLOSED->REOPENED': ['CUSTOMER', 'MANAGER', 'ADMIN'],
  'REOPENED->IN_PROGRESS': ['AGENT', 'MANAGER', 'ADMIN'],
  'REOPENED->ESCALATED': ['AGENT', 'MANAGER', 'ADMIN'],
  'REOPENED->CLOSED': ['MANAGER', 'ADMIN'],
});

class InvalidTransitionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidTransitionError';
    this.statusCode = 400;
  }
}

class ForbiddenTransitionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenTransitionError';
    this.statusCode = 403;
  }
}

/**
 * @param {string} from current status
 * @param {string} to   desired status
 * @returns {boolean} whether the transition is structurally allowed
 */
function canTransition(from, to) {
  if (!STATUSES.includes(from) || !STATUSES.includes(to)) return false;
  return (TRANSITIONS[from] || []).includes(to);
}

/**
 * Validates a transition, throwing typed errors the controller layer
 * can map straight to HTTP status codes.
 * @param {string} from
 * @param {string} to
 * @param {string} role - role of the actor attempting the change
 */
function assertTransition(from, to, role) {
  if (!STATUSES.includes(from)) {
    throw new InvalidTransitionError(`Unknown source status "${from}"`);
  }
  if (!STATUSES.includes(to)) {
    throw new InvalidTransitionError(`Unknown target status "${to}"`);
  }
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(`Cannot move ticket from ${from} to ${to}`);
  }
  const key = `${from}->${to}`;
  const allowedRoles = TRANSITION_ROLES[key] || [];
  if (!ROLES.includes(role) || !allowedRoles.includes(role)) {
    throw new ForbiddenTransitionError(`Role ${role} may not move ticket from ${from} to ${to}`);
  }
  return true;
}

/**
 * SLA due date calculator (pure — takes config in, no clock/DB access).
 * @param {Date} createdAt
 * @param {string} priority
 * @param {{priority:string, resolutionTimeMins:number}[]} slaRules
 * @returns {Date}
 */
function calculateDueDate(createdAt, priority, slaRules) {
  if (!PRIORITIES.includes(priority)) throw new Error(`Unknown priority "${priority}"`);
  const rule = slaRules.find((r) => r.priority === priority);
  if (!rule) throw new Error(`No SLA rule configured for priority "${priority}"`);
  return new Date(createdAt.getTime() + rule.resolutionTimeMins * 60 * 1000);
}

/**
 * @param {Date} now
 * @param {Date|null} dueAt
 * @param {string} status
 * @returns {boolean}
 */
function isBreached(now, dueAt, status) {
  if (!dueAt) return false;
  if (['RESOLVED', 'CLOSED'].includes(status)) return false;
  return now.getTime() > dueAt.getTime();
}

/**
 * Generates a sequential, year-scoped ticket number: TCK-2026-000123
 * @param {number} sequence
 * @param {number} year
 */
function generateTicketNumber(sequence, year = new Date().getFullYear()) {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('sequence must be a positive integer');
  }
  return `TCK-${year}-${String(sequence).padStart(6, '0')}`;
}

module.exports = {
  STATUSES,
  PRIORITIES,
  ROLES,
  TRANSITIONS,
  TRANSITION_ROLES,
  InvalidTransitionError,
  ForbiddenTransitionError,
  canTransition,
  assertTransition,
  calculateDueDate,
  isBreached,
  generateTicketNumber,
};
