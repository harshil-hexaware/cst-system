'use strict';

const amqp = require('amqplib');
const config = require('../config/env');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');

// Routing key -> handler. Keeping this as a lookup table rather than
// a switch statement makes it trivial to see the full set of events
// this service reacts to, and to add more without touching the
// consume loop itself.
const HANDLERS = {
  'user.registered': notificationService.handleUserRegistered.bind(notificationService),
  'user.email_verification_requested': notificationService.handleEmailVerificationRequested.bind(notificationService),
  'user.password_reset_requested': notificationService.handlePasswordResetRequested.bind(notificationService),
  'ticket.created': notificationService.handleTicketCreated.bind(notificationService),
  'ticket.assigned': notificationService.handleTicketAssigned.bind(notificationService),
  'ticket.status_changed': notificationService.handleTicketStatusChanged.bind(notificationService),
  'ticket.resolved': notificationService.handleTicketResolved.bind(notificationService),
  'ticket.closed': notificationService.handleTicketClosed.bind(notificationService),
  'sla.breached': notificationService.handleSlaBreached.bind(notificationService),
};

async function startConsumer(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const conn = await amqp.connect(config.rabbitmq.url);
      const channel = await conn.createChannel();
      await channel.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });
      const q = await channel.assertQueue(config.rabbitmq.queue, { durable: true });

      await Promise.all(
        Object.keys(HANDLERS).map((routingKey) => channel.bindQueue(q.queue, config.rabbitmq.exchange, routingKey)),
      );

      channel.consume(q.queue, async (msg) => {
        if (!msg) return;
        const routingKey = msg.fields.routingKey;
        try {
          const event = JSON.parse(msg.content.toString());
          const handler = HANDLERS[routingKey];
          if (handler) {
            await handler(event, event.traceId);
          } else {
            logger.warn(`No handler registered for routing key "${routingKey}", acking and dropping`);
          }
          channel.ack(msg);
        } catch (err) {
          logger.error(`Failed processing "${routingKey}" event: ${err.message}`);
          channel.nack(msg, false, false); // no requeue — see DLQ note in production readiness checklist
        }
      });

      logger.info(`notification-service consumer connected, bound to: ${Object.keys(HANDLERS).join(', ')}`);
      conn.on('close', () => {
        logger.warn('RabbitMQ connection closed — restarting consumer');
        setTimeout(() => startConsumer(), delayMs);
      });
      return;
    } catch (err) {
      logger.warn(`RabbitMQ consumer connect attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        logger.error('Giving up on RabbitMQ consumer startup; no notifications will be processed until service restarts');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { startConsumer, HANDLERS };
