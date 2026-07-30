'use strict';

const cron = require('node-cron');
const ticketRepository = require('../repositories/ticketRepository');
const publisher = require('../events/publisher');
const logger = require('../utils/logger');

/**
 * Sweeps for tickets whose due_at has passed but are neither
 * RESOLVED/CLOSED nor already flagged, flips sla_breached, and
 * publishes one sla.breached event per ticket so the notification
 * service (or anything else listening) can alert the assigned agent
 * and their manager. Pure side-effecting orchestration — the actual
 * "is this overdue" rule (`isBreached`) is the pure, unit-tested
 * function in domain/ticketStateMachine.js; this job's own job is
 * just "find candidates in the DB and act on them."
 */
async function sweepOnce(traceId = 'sla-sweep') {
  const candidates = await ticketRepository.findNewlyBreached();
  for (const ticket of candidates) {
    // eslint-disable-next-line no-await-in-loop
    await ticketRepository.markBreached(ticket.id);
    // eslint-disable-next-line no-await-in-loop
    await publisher.publish('sla.breached', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      priority: ticket.priority,
      assignedAgentId: ticket.assignedAgentId,
      dueAt: ticket.dueAt,
    }, traceId);
  }
  if (candidates.length > 0) {
    logger.info(`SLA sweep flagged ${candidates.length} newly-breached ticket(s)`, { traceId });
  }
  return candidates.length;
}

/**
 * @param {string} schedule - cron expression, default every 5 minutes
 */
function startSlaSweepJob(schedule = '*/5 * * * *') {
  cron.schedule(schedule, () => {
    sweepOnce().catch((err) => logger.error(`SLA sweep failed: ${err.message}`));
  });
  logger.info(`SLA sweep job scheduled (${schedule})`);
}

module.exports = { startSlaSweepJob, sweepOnce };
