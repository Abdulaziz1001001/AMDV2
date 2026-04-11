const { test, before } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

before(() => {
  process.env.JWT_SECRET = 't'.repeat(32);
});

const auth = require('../middleware/authMiddleware');

test('requireRole calls next for matching role', (_, done) => {
  const req = { user: { role: 'admin' } };
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json() {
      return this;
    },
  };
  auth.requireRole('admin')(req, res, () => done());
});

test('requireRole returns 403 for wrong role', () => {
  let statusCode;
  const req = { user: { role: 'employee' } };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  let nextCalled = false;
  auth.requireRole('admin')(req, res, () => {
    nextCalled = true;
  });
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(statusCode, 403);
});

test('authMiddleware rejects missing Bearer token', () => {
  let statusCode;
  const req = { header: () => undefined };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  let nextCalled = false;
  auth(req, res, () => {
    nextCalled = true;
  });
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(statusCode, 401);
});

test('authMiddleware accepts valid JWT', (_, done) => {
  const token = jwt.sign({ id: '507f1f77bcf86cd799439011', role: 'admin' }, process.env.JWT_SECRET);
  const req = {
    header: (name) => (name === 'Authorization' ? 'Bearer ' + token : undefined),
  };
  const res = {
    status() {
      return this;
    },
    json() {
      return this;
    },
  };
  auth(req, res, () => {
    assert.strictEqual(req.user.role, 'admin');
    done();
  });
});
