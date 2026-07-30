'use strict';

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_secret';

const { expect } = require('chai');
const sinon = require('sinon');

const notificationRepository = require('../src/repositories/notificationRepository');
const recipientRepository = require('../src/repositories/recipientRepository');
const mailer = require('../src/services/mailer');
const notificationService = require('../src/services/notificationService');

describe('notificationService', () => {
  afterEach(() => sinon.restore());

  describe('handleTicketCreated', () => {
    it('writes an in-app notification and sends an email when the recipient is cached', async () => {
      const createStub = sinon.stub(notificationRepository, 'create').resolves();
      sinon.stub(recipientRepository, 'findByUserId').resolves({ email: 'customer@example.com' });
      const sendStub = sinon.stub(mailer, 'sendEmail').resolves({ sent: true });

      await notificationService.handleTicketCreated({
        ticketId: 't1', ticketNumber: 'TCK-2026-000001', customerId: 'c1', subject: 'Login issue',
      }, 'trace-1');

      expect(createStub.calledOnce).to.equal(true);
      expect(createStub.firstCall.args[0].userId).to.equal('c1');
      expect(createStub.firstCall.args[0].type).to.equal('TICKET_CREATED');
      expect(sendStub.calledOnce).to.equal(true);
      expect(sendStub.firstCall.args[0].to).to.equal('customer@example.com');
    });

    it('still writes the in-app notification but skips email when no recipient is cached', async () => {
      const createStub = sinon.stub(notificationRepository, 'create').resolves();
      sinon.stub(recipientRepository, 'findByUserId').resolves(null);
      const sendStub = sinon.stub(mailer, 'sendEmail').resolves();

      await notificationService.handleTicketCreated({
        ticketId: 't1', ticketNumber: 'TCK-2026-000001', customerId: 'c1', subject: 'Login issue',
      }, 'trace-2');

      expect(createStub.calledOnce).to.equal(true);
      expect(sendStub.called).to.equal(false);
    });
  });

  describe('handleTicketStatusChanged', () => {
    it('notifies both the customer and the agent when a third party (e.g. manager) made the change', async () => {
      const createStub = sinon.stub(notificationRepository, 'create').resolves();
      sinon.stub(recipientRepository, 'findByUserId').resolves(null);
      sinon.stub(mailer, 'sendEmail').resolves();

      await notificationService.handleTicketStatusChanged({
        ticketId: 't1',
        ticketNumber: 'TCK-2026-000001',
        customerId: 'c1',
        assignedAgentId: 'a1',
        previousStatus: 'OPEN',
        newStatus: 'ESCALATED',
        changedBy: 'mgr-1',
      }, 'trace-3');

      expect(createStub.callCount).to.equal(2);
      const notifiedUserIds = createStub.getCalls().map((c) => c.args[0].userId);
      expect(notifiedUserIds).to.include('c1');
      expect(notifiedUserIds).to.include('a1');
    });

    it('does not double-notify the agent when they made the change themselves', async () => {
      const createStub = sinon.stub(notificationRepository, 'create').resolves();
      sinon.stub(recipientRepository, 'findByUserId').resolves(null);
      sinon.stub(mailer, 'sendEmail').resolves();

      await notificationService.handleTicketStatusChanged({
        ticketId: 't1',
        ticketNumber: 'TCK-2026-000001',
        customerId: 'c1',
        assignedAgentId: 'a1',
        previousStatus: 'OPEN',
        newStatus: 'IN_PROGRESS',
        changedBy: 'a1', // the agent themself
      }, 'trace-4');

      expect(createStub.callCount).to.equal(1);
      expect(createStub.firstCall.args[0].userId).to.equal('c1');
    });
  });

  describe('handleSlaBreached', () => {
    it('does nothing when the ticket has no assigned agent', async () => {
      const createStub = sinon.stub(notificationRepository, 'create').resolves();
      await notificationService.handleSlaBreached({
        ticketId: 't1', ticketNumber: 'TCK-2026-000001', priority: 'HIGH', assignedAgentId: null,
      }, 'trace-5');
      expect(createStub.called).to.equal(false);
    });
  });

  describe('handleUserRegistered', () => {
    it('upserts the recipient cache', async () => {
      const upsertStub = sinon.stub(recipientRepository, 'upsert').resolves();
      await notificationService.handleUserRegistered({
        userId: 'u1', email: 'new@example.com', firstName: 'A', lastName: 'B',
      }, 'trace-6');
      expect(upsertStub.calledOnce).to.equal(true);
      expect(upsertStub.firstCall.args[0].email).to.equal('new@example.com');
    });
  });

  describe('markRead', () => {
    it('throws 404 when the notification does not belong to the caller (or does not exist)', async () => {
      sinon.stub(notificationRepository, 'markRead').resolves(false);
      try {
        await notificationService.markRead('n1', 'someone-else');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(404);
      }
    });
  });
});
