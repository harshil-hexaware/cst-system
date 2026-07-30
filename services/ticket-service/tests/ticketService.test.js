'use strict';

const { expect } = require('chai');
const sinon = require('sinon');

const ticketRepository = require('../src/repositories/ticketRepository');
const categoryRepository = require('../src/repositories/categoryRepository');
const publisher = require('../src/events/publisher');
const ticketService = require('../src/services/ticketService');
const { ApiError } = require('../src/middleware/errorHandler');

describe('ticketService', () => {
  afterEach(() => sinon.restore());

  describe('createTicket', () => {
    it('rejects an inactive or missing category', async () => {
      sinon.stub(categoryRepository, 'findById').resolves(null);
      try {
        await ticketService.createTicket({
          customerId: 'c1', subject: 'Cannot log in', description: 'x', categoryId: 99, priority: 'HIGH',
        }, 'trace-1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(ApiError);
        expect(err.code).to.equal('INVALID_CATEGORY');
      }
    });

    it('generates a sequential ticket number and publishes ticket.created', async () => {
      sinon.stub(categoryRepository, 'findById').resolves({ id: 1, isActive: true });
      sinon.stub(ticketRepository, 'countBySequenceThisYear').resolves(4); // -> next is 5
      sinon.stub(ticketRepository, 'getSlaRules').resolves([{ priority: 'HIGH', resolutionTimeMins: 480 }]);
      const created = { id: 't1', ticketNumber: `TCK-${new Date().getFullYear()}-000005`, status: 'OPEN' };
      const createStub = sinon.stub(ticketRepository, 'create').resolves(created);
      sinon.stub(ticketRepository, 'addHistory').resolves();
      const publishStub = sinon.stub(publisher, 'publish').resolves();

      const ticket = await ticketService.createTicket({
        customerId: 'c1', subject: 'Cannot log in', description: 'x', categoryId: 1, priority: 'HIGH',
      }, 'trace-2');

      expect(ticket.ticketNumber).to.match(/^TCK-\d{4}-000005$/);
      expect(createStub.calledOnce).to.equal(true);
      expect(publishStub.calledOnceWith('ticket.created')).to.equal(true);
    });
  });

  describe('getTicket / ownership scoping', () => {
    it('forbids a customer from viewing another customer\'s ticket', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1', customerId: 'owner', comments: [] });
      try {
        await ticketService.getTicket('t1', { id: 'someone-else', role: 'CUSTOMER' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });

    it('forbids an agent from viewing a ticket not assigned to them', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1', assignedAgentId: 'agent-a', comments: [] });
      try {
        await ticketService.getTicket('t1', { id: 'agent-b', role: 'AGENT' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });

    it('strips internal notes from a customer\'s view of their own ticket', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({
        id: 't1',
        customerId: 'owner',
        comments: [
          { id: 'c1', isInternal: false, body: 'public note' },
          { id: 'c2', isInternal: true, body: 'internal note' },
        ],
      });
      const ticket = await ticketService.getTicket('t1', { id: 'owner', role: 'CUSTOMER' });
      expect(ticket.comments).to.have.length(1);
      expect(ticket.comments[0].isInternal).to.equal(false);
    });

    it('strips internal notes from an agent\'s view too (internal notes are MANAGER/ADMIN only)', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({
        id: 't1',
        assignedAgentId: 'agent-a',
        comments: [
          { id: 'c1', isInternal: false, body: 'public note' },
          { id: 'c2', isInternal: true, body: 'internal note' },
        ],
      });
      const ticket = await ticketService.getTicket('t1', { id: 'agent-a', role: 'AGENT' });
      expect(ticket.comments).to.have.length(1);
      expect(ticket.comments[0].isInternal).to.equal(false);
    });

    it('keeps internal notes visible to MANAGER and ADMIN', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({
        id: 't1',
        customerId: 'someone',
        comments: [
          { id: 'c1', isInternal: false, body: 'public note' },
          { id: 'c2', isInternal: true, body: 'internal note' },
        ],
      });
      const ticket = await ticketService.getTicket('t1', { id: 'mgr-1', role: 'MANAGER' });
      expect(ticket.comments).to.have.length(2);
    });

    it('filters correctly when findById returns a Sequelize-style instance (regression test: plain reassignment of an association property does not serialize reliably — must go through .get({plain:true}))', async () => {
      const rawComments = [
        { id: 'c1', isInternal: false, body: 'public note' },
        { id: 'c2', isInternal: true, body: 'internal note' },
      ];
      // Simulates a real Sequelize Model instance: dataValues is the
      // actual source of truth for serialization, and .get({plain:true})
      // returns a fresh plain object built from it — mirroring how
      // toJSON()/JSON.stringify would behave in production.
      const fakeSequelizeInstance = {
        get(options) {
          if (options && options.plain) {
            return { id: 't1', customerId: 'owner', comments: [...rawComments] };
          }
          return this;
        },
      };
      sinon.stub(ticketRepository, 'findById').resolves(fakeSequelizeInstance);

      const ticket = await ticketService.getTicket('t1', { id: 'owner', role: 'CUSTOMER' });
      expect(ticket.comments).to.have.length(1);
      expect(ticket.comments[0].isInternal).to.equal(false);
    });

    it('allows a manager to view any ticket', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1', customerId: 'someone', comments: [] });
      const ticket = await ticketService.getTicket('t1', { id: 'mgr-1', role: 'MANAGER' });
      expect(ticket.id).to.equal('t1');
    });
  });

  describe('updateStatus', () => {
    it('rejects an invalid transition (e.g. OPEN -> CLOSED by an AGENT)', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1', status: 'OPEN', customerId: 'c1', assignedAgentId: 'a1' });
      try {
        await ticketService.updateStatus('t1', { status: 'CLOSED' }, { id: 'a1', role: 'AGENT' }, 'trace-3');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
        expect(err.code).to.equal('FORBIDDEN_TRANSITION');
      }
    });

    it('allows an AGENT to move OPEN -> IN_PROGRESS and records history + publishes event', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1', status: 'OPEN', customerId: 'c1', assignedAgentId: 'a1', ticketNumber: 'TCK-2026-000001' });
      const updateStub = sinon.stub(ticketRepository, 'update').resolves({ id: 't1', status: 'IN_PROGRESS' });
      const historyStub = sinon.stub(ticketRepository, 'addHistory').resolves();
      const publishStub = sinon.stub(publisher, 'publish').resolves();

      const result = await ticketService.updateStatus('t1', { status: 'IN_PROGRESS' }, { id: 'a1', role: 'AGENT' }, 'trace-4');

      expect(result.status).to.equal('IN_PROGRESS');
      expect(updateStub.calledOnceWith('t1', sinon.match({ status: 'IN_PROGRESS' }))).to.equal(true);
      expect(historyStub.calledOnce).to.equal(true);
      expect(publishStub.calledWith('ticket.status_changed')).to.equal(true);
    });

    it('allows a CUSTOMER to reopen their own CLOSED ticket', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1', status: 'CLOSED', customerId: 'c1', assignedAgentId: 'a1', ticketNumber: 'TCK-2026-000001' });
      sinon.stub(ticketRepository, 'update').resolves({ id: 't1', status: 'REOPENED' });
      sinon.stub(ticketRepository, 'addHistory').resolves();
      sinon.stub(publisher, 'publish').resolves();

      const result = await ticketService.updateStatus('t1', { status: 'REOPENED' }, { id: 'c1', role: 'CUSTOMER' }, 'trace-5');
      expect(result.status).to.equal('REOPENED');
    });
  });

  describe('addComment', () => {
    it('rejects a CUSTOMER attempting to add an internal note', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1', customerId: 'c1' });
      try {
        await ticketService.addComment('t1', { body: 'secret', isInternal: true }, { id: 'c1', role: 'CUSTOMER' }, 'trace-6');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });

    it('rejects an AGENT attempting to add an internal note (restricted to MANAGER/ADMIN)', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1', assignedAgentId: 'a1' });
      try {
        await ticketService.addComment('t1', { body: 'secret', isInternal: true }, { id: 'a1', role: 'AGENT' }, 'trace-6b');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });

    it('allows a MANAGER to add an internal note', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1', customerId: 'c1' });
      sinon.stub(ticketRepository, 'addComment').resolves({ id: 'cmt1', isInternal: true });
      sinon.stub(publisher, 'publish').resolves();
      const comment = await ticketService.addComment('t1', { body: 'internal detail', isInternal: true }, { id: 'mgr-1', role: 'MANAGER' }, 'trace-6c');
      expect(comment.isInternal).to.equal(true);
    });
  });

  describe('autoAssignTicket', () => {
    it('throws 409 when no active agents are available', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1' });
      const userServiceClient = require('../src/services/userServiceClient');
      sinon.stub(userServiceClient, 'fetchActiveAgents').resolves([]);

      try {
        await ticketService.autoAssignTicket('t1', { id: 'mgr-1', role: 'MANAGER' }, 'token', 'trace-7');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(409);
        expect(err.code).to.equal('NO_AGENTS_AVAILABLE');
      }
    });
  });

  describe('getAttachmentFile', () => {
    it('rejects a customer downloading an attachment on someone else\'s ticket', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1', customerId: 'owner' });
      try {
        await ticketService.getAttachmentFile('t1', 'att1', { id: 'someone-else', role: 'CUSTOMER' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });

    it('404s when the attachment does not belong to the given ticket', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1', customerId: 'owner' });
      sinon.stub(ticketRepository, 'findAttachmentById').resolves({ id: 'att1', ticketId: 'different-ticket' });
      try {
        await ticketService.getAttachmentFile('t1', 'att1', { id: 'owner', role: 'CUSTOMER' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(404);
      }
    });

    it('returns the attachment for the ticket owner', async () => {
      sinon.stub(ticketRepository, 'findById').resolves({ id: 't1', customerId: 'owner' });
      sinon.stub(ticketRepository, 'findAttachmentById').resolves({ id: 'att1', ticketId: 't1', fileName: 'screenshot.png' });
      const attachment = await ticketService.getAttachmentFile('t1', 'att1', { id: 'owner', role: 'CUSTOMER' });
      expect(attachment.fileName).to.equal('screenshot.png');
    });
  });
});
