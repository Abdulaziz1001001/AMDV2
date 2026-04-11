const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Admin = require('../models/Admin');
const Employee = require('../models/Employee');

let mongod;
let app;

before(async () => {
  process.env.JWT_SECRET = 'i'.repeat(32);
  process.env.FRONTEND_ORIGIN = 'http://127.0.0.1';
  process.env.LOG_LEVEL = 'fatal';
  process.env.AUTH_RATE_LIMIT_MAX = '10000';

  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  delete require.cache[require.resolve('../app')];
  const { createApp } = require('../app');
  app = createApp();
  await mongoose.connect(process.env.MONGO_URI);

  const salt = await bcrypt.genSalt(10);
  await Admin.create({
    username: 'testadmin',
    password: await bcrypt.hash('secretpass', salt),
    name: 'Test Admin',
  });

  const empSalt = await bcrypt.genSalt(10);
  await Employee.create({
    eid: 'E1',
    name: 'Test Emp',
    username: 'testemp',
    password: await bcrypt.hash('empsecret', empSalt),
    active: true,
    groupId: 'g1',
  });
});

after(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

test('POST /api/auth/admin-login rejects invalid credentials', async () => {
  const res = await request(app)
    .post('/api/auth/admin-login')
    .send({ username: 'nope', password: 'bad' })
    .expect(400);
  assert.match(res.body.msg, /Invalid/i);
});

test('POST /api/auth/admin-login succeeds', async () => {
  const res = await request(app)
    .post('/api/auth/admin-login')
    .send({ username: 'testadmin', password: 'secretpass' })
    .expect(200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.name, 'Test Admin');
});

test('POST /api/auth/admin-login validates body', async () => {
  const res = await request(app).post('/api/auth/admin-login').send({ username: '' }).expect(400);
  assert.ok(res.body.msg);
});

test('GET /api/admin/all-data without token returns 401', async () => {
  await request(app).get('/api/admin/all-data').expect(401);
});

test('GET /api/admin/all-data with admin token returns data', async () => {
  const login = await request(app)
    .post('/api/auth/admin-login')
    .send({ username: 'testadmin', password: 'secretpass' });
  const token = login.body.token;
  const res = await request(app).get('/api/admin/all-data').set('Authorization', 'Bearer ' + token).expect(200);
  assert.ok(Array.isArray(res.body.employees));
  assert.ok(res.body.workPolicy);
  assert.equal(res.body.workPolicy.key, 'company');
  assert.ok(typeof res.body.notificationUnreadCount === 'number');
});

test('GET /api/admin/work-policy with admin token', async () => {
  const login = await request(app)
    .post('/api/auth/admin-login')
    .send({ username: 'testadmin', password: 'secretpass' });
  const token = login.body.token;
  const res = await request(app).get('/api/admin/work-policy').set('Authorization', 'Bearer ' + token).expect(200);
  assert.equal(res.body.key, 'company');
  assert.ok(Array.isArray(res.body.excuseReasons));
});

test('PATCH /api/admin/notifications/:id/read without token returns 401', async () => {
  await request(app).patch('/api/admin/notifications/507f1f77bcf86cd799439011/read').expect(401);
});

test('employee token cannot access admin all-data', async () => {
  const login = await request(app)
    .post('/api/auth/emp-login')
    .send({ username: 'testemp', password: 'empsecret' });
  const token = login.body.token;
  await request(app).get('/api/admin/all-data').set('Authorization', 'Bearer ' + token).expect(403);
});
