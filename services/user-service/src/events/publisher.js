'use strict';

const amqp = require('amqplib');
const config = require('../config/env');
const logger = require('../utils/logger');

let channel = null;

async function connect() {
  if (channel) return channel;
  const conn = await amqp.connect(config.rabbitmq.url);
  channel = await conn.createChannel();
  await channel.assertExchange(config.rabbitmq.exchange, 'topic', { durable: true });
  conn.on('close', () => { logger.warn('RabbitMQ connection closed'); channel = null; });
  return channel;
}

async function publish(routingKey, payload, traceId) {
  try {
    const ch = await connect();
    const message = Buffer.from(JSON.stringify({ ...payload, traceId, emittedAt: new Date().toISOString() }));
    ch.publish(config.rabbitmq.exchange, routingKey, message, { persistent: true, contentType: 'application/json' });
    logger.info(`Event published: ${routingKey}`, { traceId });
  } catch (err) {
    logger.error(`Failed to publish event ${routingKey}: ${err.message}`, { traceId });
  }
}

module.exports = { publish };
