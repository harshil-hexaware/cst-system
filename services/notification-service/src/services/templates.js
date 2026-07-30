'use strict';

/**
 * Pure functions: event payload in, {title, body, emailSubject,
 * emailHtml} out. No I/O, no dependencies — trivially unit-testable,
 * and the single source of truth for both the in-app notification
 * text and the email content so they never drift apart.
 */

function ticketCreated({ ticketNumber, subject }) {
  const title = `Ticket ${ticketNumber} created`;
  const body = `Your ticket "${subject}" has been received. We'll be in touch shortly.`;
  return {
    title,
    body,
    emailSubject: `[${ticketNumber}] We've received your request`,
    emailHtml: `<p>Hi,</p><p>We've created ticket <strong>${ticketNumber}</strong> for "${escapeHtml(subject)}". Our team will follow up soon.</p>`,
  };
}

function ticketAssigned({ ticketNumber }) {
  const title = `Ticket ${ticketNumber} assigned to you`;
  const body = `You've been assigned ticket ${ticketNumber}. Please review it.`;
  return {
    title,
    body,
    emailSubject: `[${ticketNumber}] Assigned to you`,
    emailHtml: `<p>Hi,</p><p>Ticket <strong>${ticketNumber}</strong> has been assigned to you. Please take a look when you can.</p>`,
  };
}

function ticketStatusChanged({ ticketNumber, previousStatus, newStatus }) {
  const title = `Ticket ${ticketNumber}: ${previousStatus} → ${newStatus}`;
  const body = `Status changed from ${previousStatus} to ${newStatus}.`;
  return {
    title,
    body,
    emailSubject: `[${ticketNumber}] Status updated to ${newStatus}`,
    emailHtml: `<p>Hi,</p><p>Ticket <strong>${ticketNumber}</strong> moved from <em>${previousStatus}</em> to <em>${newStatus}</em>.</p>`,
  };
}

function ticketResolved({ ticketNumber }) {
  const title = `Ticket ${ticketNumber} resolved`;
  const body = 'Your ticket has been marked resolved. Let us know if you need it reopened.';
  return {
    title,
    body,
    emailSubject: `[${ticketNumber}] Resolved`,
    emailHtml: `<p>Hi,</p><p>Good news — ticket <strong>${ticketNumber}</strong> has been marked <em>resolved</em>. If this didn't fix things, you can reopen it from the ticket page.</p>`,
  };
}

function ticketClosed({ ticketNumber }) {
  const title = `Ticket ${ticketNumber} closed`;
  const body = 'Your ticket has been closed.';
  return {
    title,
    body,
    emailSubject: `[${ticketNumber}] Closed`,
    emailHtml: `<p>Hi,</p><p>Ticket <strong>${ticketNumber}</strong> has been closed. Thanks for reaching out.</p>`,
  };
}

function slaBreached({ ticketNumber, priority }) {
  const title = `SLA breached: ${ticketNumber}`;
  const body = `This ${priority} priority ticket has passed its SLA due date.`;
  return {
    title,
    body,
    emailSubject: `⚠ SLA breach — [${ticketNumber}]`,
    emailHtml: `<p><strong>SLA breach</strong>: ticket <strong>${ticketNumber}</strong> (priority ${priority}) has passed its due date and still isn't resolved.</p>`,
  };
}

function emailVerification({ verificationToken, frontendUrl }) {
  const link = `${frontendUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`;
  return {
    title: 'Verify your email',
    body: 'Please verify your email address.',
    emailSubject: 'Verify your email address',
    emailHtml: `<p>Welcome! Please verify your email by clicking the link below:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
  };
}

function passwordResetRequested({ resetToken, frontendUrl }) {
  const link = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  return {
    title: 'Password reset requested',
    body: 'A password reset was requested for your account.',
    emailSubject: 'Reset your password',
    emailHtml: `<p>We received a request to reset your password. Click below to choose a new one:</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>`,
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  ticketCreated,
  ticketAssigned,
  ticketStatusChanged,
  ticketResolved,
  ticketClosed,
  slaBreached,
  emailVerification,
  passwordResetRequested,
  escapeHtml,
};
