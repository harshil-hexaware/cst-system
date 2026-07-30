'use strict';

require('express-async-errors');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const config = require('./config/env');
const logger = require('./utils/logger');
const traceId = require('./middleware/traceId');
const gatewayAuth = require('./middleware/gatewayAuth');
const { authProxy, userProxy, ticketProxy, notificationProxy } = require('./routes/proxies');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(traceId);
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
}));

app.get('/health', (req, res) => res.status(200).json({ status: 'UP', service: config.serviceName }));

// Swagger UI — served by the gateway since it's the single public entry point
const swaggerDoc = YAML.load(path.join(__dirname, 'docs', 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Perimeter JWT pre-check (fails fast); downstream services verify independently
app.use(gatewayAuth);

// NOTE: no express.json() here on purpose — the gateway proxies the raw
// request body/stream straight through (including multipart file
// uploads for /api/tickets/*/attachments) rather than parsing and
// re-serializing it, which would break streamed uploads.
app.use('/api/auth', authProxy);
app.use('/api/users', userProxy);
app.use('/api/tickets', ticketProxy);
app.use('/api/notifications', notificationProxy);

app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
});

module.exports = app;
