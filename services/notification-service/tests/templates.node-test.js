'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const templates = require('../src/services/templates');

test('ticketCreated includes the ticket number in both title and email subject', () => {
  const result = templates.ticketCreated({ ticketNumber: 'TCK-2026-000001', subject: 'Cannot log in' });
  assert.match(result.title, /TCK-2026-000001/);
  assert.match(result.emailSubject, /TCK-2026-000001/);
});

test('ticketStatusChanged reflects both the previous and new status', () => {
  const result = templates.ticketStatusChanged({ ticketNumber: 'TCK-2026-000001', previousStatus: 'OPEN', newStatus: 'IN_PROGRESS' });
  assert.match(result.title, /OPEN/);
  assert.match(result.title, /IN_PROGRESS/);
});

test('slaBreached mentions the priority level', () => {
  const result = templates.slaBreached({ ticketNumber: 'TCK-2026-000001', priority: 'CRITICAL' });
  assert.match(result.body, /CRITICAL/);
});

test('emailVerification builds a link with the token and frontend URL', () => {
  const result = templates.emailVerification({ verificationToken: 'abc123', frontendUrl: 'http://localhost:3000' });
  assert.match(result.emailHtml, /http:\/\/localhost:3000\/verify-email\?token=abc123/);
});

test('passwordResetRequested builds a link with the token and frontend URL', () => {
  const result = templates.passwordResetRequested({ resetToken: 'xyz789', frontendUrl: 'http://localhost:3000' });
  assert.match(result.emailHtml, /http:\/\/localhost:3000\/reset-password\?token=xyz789/);
});

test('escapeHtml neutralizes angle brackets and quotes to prevent HTML injection in email bodies', () => {
  const escaped = templates.escapeHtml('<script>alert("x")</script>');
  assert.doesNotMatch(escaped, /<script>/);
  assert.match(escaped, /&lt;script&gt;/);
});

test('ticketCreated HTML-escapes the subject to prevent injection from user-supplied ticket subjects', () => {
  const result = templates.ticketCreated({ ticketNumber: 'TCK-2026-000001', subject: '<img src=x onerror=alert(1)>' });
  assert.doesNotMatch(result.emailHtml, /<img src=x/);
});
