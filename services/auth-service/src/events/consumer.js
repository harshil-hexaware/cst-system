'use strict';

const amqp = require('amqplib');
const config = require('../config/env');
const logger = require('../utils/logger');
const userRepository = require('../repositories/userRepository');
const { ROLE_IDS } = require('../domain/roles');

async function startConsumer(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const conn = await amqp.connect(config.rabbitmq.url);
      const channel = await conn.createChannel();
      await channel.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });
      const q = await channel.assertQueue('auth-service.role-sync', { durable: true });
      await channel.bindQueue(q.queue, config.rabbitmq.exchange, 'user.role_changed');
      await channel.bindQueue(q.queue, config.rabbitmq.exchange, 'user.deleted');

      channel.consume(q.queue, async (msg) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());

          if (msg.fields.routingKey === 'user.deleted') {
            await userRepository.deleteById(event.userId);
            logger.info('Deleted user from auth-service following user.deleted event', { traceId: event.traceId, userId: event.userId });
            channel.ack(msg);
            return;
          }

          // user.role_changed
          const roleId = ROLE_IDS[event.role];
          if (!roleId) {
            logger.warn(`Unknown role "${event.role}" in user.role_changed event, ignoring`, { traceId: event.traceId });
            channel.ack(msg);
            return;
          }
          await userRepository.updateRole(event.userId, roleId);
          logger.info('Synced role_id from user.role_changed event', { traceId: event.traceId, userId: event.userId, role: event.role });
          channel.ack(msg);
        } catch (err) {
          logger.error(`Failed processing ${msg.fields.routingKey} event: ${err.message}`);
          channel.nack(msg, false, false);
        }
      });

      logger.info('auth-service role-sync consumer connected and listening');
      conn.on('close', () => {
        logger.warn('RabbitMQ connection closed — restarting role-sync consumer');
        setTimeout(() => startConsumer(), delayMs);
      });
      return;
    } catch (err) {
      logger.warn(`RabbitMQ consumer connect attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        logger.error('Giving up on RabbitMQ role-sync consumer startup; role changes will not sync until service restarts');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { startConsumer };
