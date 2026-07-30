'use strict';

const nodemailer = require('nodemailer');
const config = require('../config/env');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (!config.smtp.host) return null; // SMTP not configured — caller falls back to logging
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
  });
  return transporter;
}

/**
 * @param {{to: string, subject: string, html: string}} message
 */
async function sendEmail({ to, subject, html }, traceId) {
  const t = getTransporter();

  if (!t) {
    // No SMTP configured — this is the expected state for local/dev
    // runs of this build. Log what WOULD have been sent so the
    // notification flow is still visible and testable end-to-end.
    logger.info('SMTP not configured — logging email instead of sending', {
      traceId, to, subject,
    });
    return { sent: false, logged: true };
  }

  try {
    await t.sendMail({
      from: config.smtp.from, to, subject, html,
    });
    logger.info('Email sent', { traceId, to, subject });
    return { sent: true };
  } catch (err) {
    logger.error(`Failed to send email to ${to}: ${err.message}`, { traceId });
    return { sent: false, error: err.message };
  }
}

module.exports = { sendEmail };
