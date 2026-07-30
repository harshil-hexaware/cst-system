'use strict';

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_secret';

const { expect } = require('chai');
const jwt = require('jsonwebtoken');
const gatewayAuth = require('../src/middleware/gatewayAuth');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

describe('gatewayAuth middleware', () => {
  it('allows unauthenticated access to /api/auth/login', () => {
    const req = { path: '/api/auth/login', headers: {} };
    const res = mockRes();
    let nextCalled = false;
    gatewayAuth(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
  });

  it('rejects a protected route with no Authorization header', () => {
    const req = { path: '/api/tickets', headers: {} };
    const res = mockRes();
    gatewayAuth(req, res, () => { throw new Error('should not call next'); });
    expect(res.statusCode).to.equal(401);
  });

  it('rejects a protected route with an invalid token', () => {
    const req = { path: '/api/tickets', headers: { authorization: 'Bearer not-a-real-token' } };
    const res = mockRes();
    gatewayAuth(req, res, () => { throw new Error('should not call next'); });
    expect(res.statusCode).to.equal(401);
  });

  it('allows a protected route with a valid token', () => {
    const token = jwt.sign({ sub: 'u1', role: 'CUSTOMER' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
    const req = { path: '/api/tickets', headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nextCalled = false;
    gatewayAuth(req, res, () => { nextCalled = true; });
    expect(nextCalled).to.equal(true);
  });
});
