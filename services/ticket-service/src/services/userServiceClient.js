'use strict';

const axios = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

const client = axios.create({ baseURL: config.userServiceUrl, timeout: 5000 });

/**
 * Calls GET /api/users/agents on user-service using a service-to-service
 * token minted by forwarding the caller's own access token (simplest
 * viable approach for this MVP). A production system would use a
 * dedicated service-account JWT or mTLS instead of user impersonation.
 */
async function fetchActiveAgents(callerAccessToken, traceId) {
  try {
    const response = await client.get('/api/users/agents', {
      headers: { Authorization: `Bearer ${callerAccessToken}`, 'x-trace-id': traceId },
    });
    return response.data.data; // [{ userId, workloadCount, isActive, ... }]
  } catch (err) {
    logger.error(`Failed to fetch active agents from user-service: ${err.message}`, { traceId });
    return [];
  }
}

module.exports = { fetchActiveAgents };
