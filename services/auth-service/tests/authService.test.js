'use strict';

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';

const { expect } = require('chai');
const sinon = require('sinon');
const bcrypt = require('bcrypt');

const userRepository = require('../src/repositories/userRepository');
const publisher = require('../src/events/publisher');
const authService = require('../src/services/authService');
const { ApiError } = require('../src/middleware/errorHandler');

describe('authService', () => {
  afterEach(() => sinon.restore());

  describe('register', () => {
    it('rejects registration when email already exists', async () => {
      sinon.stub(userRepository, 'findByEmail').resolves({ id: 'existing-id' });

      try {
        await authService.register({
          email: 'taken@example.com', password: 'Str0ng!Passw0rd', firstName: 'A', lastName: 'B', role: 'CUSTOMER',
        }, 'trace-1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(ApiError);
        expect(err.statusCode).to.equal(409);
      }
    });

    it('creates a user, hashes the password, and publishes user.registered', async () => {
      sinon.stub(userRepository, 'findByEmail').resolves(null);
      const created = {
        id: 'new-id',
        email: 'new@example.com',
        toSafeJSON: () => ({ id: 'new-id', email: 'new@example.com' }),
      };
      const createStub = sinon.stub(userRepository, 'create').resolves(created);
      const publishStub = sinon.stub(publisher, 'publish').resolves();

      const result = await authService.register({
        email: 'new@example.com', password: 'Str0ng!Passw0rd', firstName: 'Jane', lastName: 'Doe', role: 'CUSTOMER',
      }, 'trace-2');

      expect(result.id).to.equal('new-id');
      expect(createStub.calledOnce).to.equal(true);
      const passwordHashArg = createStub.firstCall.args[0].passwordHash;
      expect(await bcrypt.compare('Str0ng!Passw0rd', passwordHashArg)).to.equal(true);
      expect(publishStub.calledOnceWith('user.registered')).to.equal(true);
    });
  });

  describe('login', () => {
    it('rejects an unknown email with a generic 401 (no user enumeration)', async () => {
      sinon.stub(userRepository, 'findByEmail').resolves(null);
      try {
        await authService.login({ email: 'nobody@example.com', password: 'whatever' }, 'trace-3');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(401);
        expect(err.code).to.equal('INVALID_CREDENTIALS');
      }
    });

    it('rejects a wrong password with the same generic 401', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass1!', 10);
      sinon.stub(userRepository, 'findByEmail').resolves({
        id: 'u1', isActive: true, passwordHash, roleId: 1, email: 'u@example.com', toSafeJSON: () => ({}),
      });
      try {
        await authService.login({ email: 'u@example.com', password: 'WrongPass1!' }, 'trace-4');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(401);
      }
    });

    it('returns access+refresh tokens on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass1!', 10);
      sinon.stub(userRepository, 'findByEmail').resolves({
        id: 'u1', isActive: true, passwordHash, roleId: 2, email: 'agent@example.com', toSafeJSON: () => ({ id: 'u1' }),
      });
      sinon.stub(userRepository, 'updateRefreshTokenHash').resolves();
      sinon.stub(userRepository, 'updateLastLogin').resolves();

      const result = await authService.login({ email: 'agent@example.com', password: 'CorrectPass1!' }, 'trace-5');
      expect(result).to.have.property('accessToken');
      expect(result).to.have.property('refreshToken');
    });
  });

  describe('changePassword', () => {
    it('rejects when current password is incorrect', async () => {
      const passwordHash = await bcrypt.hash('RealPass1!', 10);
      sinon.stub(userRepository, 'findById').resolves({ id: 'u1', passwordHash });

      try {
        await authService.changePassword('u1', { currentPassword: 'WrongPass1!', newPassword: 'NewPass1!' }, 'trace-6');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.statusCode).to.equal(401);
      }
    });
  });
});
