'use strict';

const { expect } = require('chai');
const sinon = require('sinon');

const userProfileRepository = require('../src/repositories/userProfileRepository');
const publisher = require('../src/events/publisher');
const userService = require('../src/services/userService');
const { ApiError } = require('../src/middleware/errorHandler');

describe('userService', () => {
  afterEach(() => sinon.restore());

  describe('getProfile', () => {
    it('throws 404 when profile does not exist', async () => {
      sinon.stub(userProfileRepository, 'findByUserId').resolves(null);
      try {
        await userService.getProfile('missing-id');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(ApiError);
        expect(err.statusCode).to.equal(404);
      }
    });

    it('returns the profile when found', async () => {
      sinon.stub(userProfileRepository, 'findByUserId').resolves({ userId: 'u1', firstName: 'Jane' });
      const profile = await userService.getProfile('u1');
      expect(profile.firstName).to.equal('Jane');
    });
  });

  describe('changeRole', () => {
    const admin = { id: 'admin-1', role: 'ADMIN' };
    const manager = { id: 'mgr-1', role: 'MANAGER' };

    it('throws 404 for a non-existent user (ADMIN acting)', async () => {
      sinon.stub(userProfileRepository, 'findByUserId').resolves(null);
      try {
        await userService.changeRole(admin, 'missing-id', 'AGENT', 'trace-1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(404);
      }
    });

    it('rejects assigning ADMIN through the API, even by an ADMIN', async () => {
      try {
        await userService.changeRole(admin, 'u1', 'ADMIN', 'trace-2');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });

    it('rejects a MANAGER assigning the MANAGER role', async () => {
      try {
        await userService.changeRole(manager, 'u1', 'MANAGER', 'trace-3');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });

    it('allows an ADMIN to assign MANAGER', async () => {
      sinon.stub(userProfileRepository, 'findByUserId').resolves({ userId: 'u1', role: 'CUSTOMER' });
      sinon.stub(userProfileRepository, 'update').resolves({ userId: 'u1', role: 'MANAGER' });
      sinon.stub(publisher, 'publish').resolves();
      const result = await userService.changeRole(admin, 'u1', 'MANAGER', 'trace-4');
      expect(result.role).to.equal('MANAGER');
    });

    it('allows a MANAGER to assign AGENT and publishes user.role_changed', async () => {
      sinon.stub(userProfileRepository, 'findByUserId').resolves({ userId: 'u1', role: 'CUSTOMER' });
      const updateStub = sinon.stub(userProfileRepository, 'update').resolves({ userId: 'u1', role: 'AGENT' });
      const publishStub = sinon.stub(publisher, 'publish').resolves();

      const result = await userService.changeRole(manager, 'u1', 'AGENT', 'trace-5');

      expect(result.role).to.equal('AGENT');
      expect(updateStub.calledOnceWith('u1', { role: 'AGENT' })).to.equal(true);
      expect(publishStub.calledOnceWith('user.role_changed', { userId: 'u1', role: 'AGENT' })).to.equal(true);
    });

    it('allows an ADMIN to assign AGENT too', async () => {
      sinon.stub(userProfileRepository, 'findByUserId').resolves({ userId: 'u1', role: 'CUSTOMER' });
      sinon.stub(userProfileRepository, 'update').resolves({ userId: 'u1', role: 'AGENT' });
      sinon.stub(publisher, 'publish').resolves();
      const result = await userService.changeRole(admin, 'u1', 'AGENT', 'trace-6');
      expect(result.role).to.equal('AGENT');
    });

    it('rejects a MANAGER demoting a user back to CUSTOMER', async () => {
      try {
        await userService.changeRole(manager, 'u1', 'CUSTOMER', 'trace-7');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(403);
      }
    });
  });

  describe('deactivate / activate', () => {
    it('sets isActive to false on deactivate', async () => {
      sinon.stub(userProfileRepository, 'findByUserId').resolves({ userId: 'u1' });
      const updateStub = sinon.stub(userProfileRepository, 'update').resolves({ userId: 'u1', isActive: false });
      const result = await userService.deactivate('u1', 'trace-3');
      expect(result.isActive).to.equal(false);
      expect(updateStub.calledOnceWith('u1', { isActive: false })).to.equal(true);
    });
  });

  describe('listUsers (manager scoping)', () => {
    it('forces role=AGENT when a MANAGER lists users, even if they pass a different filter', async () => {
      const listStub = sinon.stub(userProfileRepository, 'list').resolves({ rows: [], count: 0 });
      await userService.listUsers({ id: 'mgr-1', role: 'MANAGER' }, { role: 'ADMIN', page: 1 });
      expect(listStub.calledOnceWith({ role: 'AGENT', page: 1 })).to.equal(true);
    });

    it('leaves the query untouched for an ADMIN', async () => {
      const listStub = sinon.stub(userProfileRepository, 'list').resolves({ rows: [], count: 0 });
      await userService.listUsers({ id: 'admin-1', role: 'ADMIN' }, { role: 'CUSTOMER', page: 2 });
      expect(listStub.calledOnceWith({ role: 'CUSTOMER', page: 2 })).to.equal(true);
    });
  });

  describe('deleteUser', () => {
    const admin = { id: 'admin-1', role: 'ADMIN' };

    it('rejects an admin trying to delete their own account', async () => {
      try {
        await userService.deleteUser(admin, 'admin-1', 'trace-8');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(400);
        expect(err.code).to.equal('CANNOT_DELETE_SELF');
      }
    });

    it('throws 404 for a non-existent user', async () => {
      sinon.stub(userProfileRepository, 'findByUserId').resolves(null);
      try {
        await userService.deleteUser(admin, 'missing-id', 'trace-9');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(404);
      }
    });

    it('deletes the profile and publishes user.deleted', async () => {
      sinon.stub(userProfileRepository, 'findByUserId').resolves({ userId: 'u1', role: 'AGENT' });
      const deleteStub = sinon.stub(userProfileRepository, 'deleteByUserId').resolves(1);
      const publishStub = sinon.stub(publisher, 'publish').resolves();

      await userService.deleteUser(admin, 'u1', 'trace-10');

      expect(deleteStub.calledOnceWith('u1')).to.equal(true);
      expect(publishStub.calledOnceWith('user.deleted', { userId: 'u1' })).to.equal(true);
    });
  });
});
