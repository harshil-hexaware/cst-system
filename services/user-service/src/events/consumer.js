'use strict';

const amqp = require('amqplib');
const config = require('../config/env');
const logger = require('../utils/logger');
const userProfileRepository = require('../repositories/userProfileRepository');

async function startConsumer(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const conn = await amqp.connect(config.rabbitmq.url);
      const channel = await conn.createChannel();
      await channel.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });
      const q = await channel.assertQueue(config.rabbitmq.queue, { durable: true });
      await channel.bindQueue(q.queue, config.rabbitmq.exchange, 'user.registered');

      channel.consume(q.queue, async (msg) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());
          const existing = await userProfileRepository.findByUserId(event.userId);
          if (!existing) {
            await userProfileRepository.create({
              userId: event.userId,
              email: event.email,
              role: event.role,
              firstName: event.firstName,
              lastName: event.lastName,
            });
            logger.info('User profile created from user.registered event', { traceId: event.traceId, userId: event.userId });
          }
          channel.ack(msg);
        } catch (err) {
          logger.error(`Failed processing user.registered event: ${err.message}`);
          // Requeue once; a production system would route to a dead-letter queue after N attempts.
          channel.nack(msg, false, false);
        }
      });

      logger.info('user-service event consumer connected and listening');
      conn.on('close', () => {
        logger.warn('RabbitMQ connection closed — restarting consumer');
        setTimeout(() => startConsumer(), delayMs);
      });
      return;
    } catch (err) {
      logger.warn(`RabbitMQ consumer connect attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        logger.error('Giving up on RabbitMQ consumer startup; profiles will not auto-sync until service restarts');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { startConsumer };
