require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pino = require('pino');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');

// 1. Import all your routes at the top
const authRoutes = require('./routes/auth');
const hrRoutes = require('./routes/hr');
const adminRoutes = require('./routes/admin');
const employeeRoutes = require('./routes/employee');
const earlyCheckoutRoutes = require('./routes/earlyCheckout');
const overtimeRoutes = require('./routes/overtime');
const shiftRoutes = require('./routes/shifts');
const projectRoutes = require('./routes/projects');
const attendanceRoutes = require('./routes/attendance');
const auditRoutes = require('./routes/audit');
const announcementRoutes = require('./routes/announcements');
const onboardingRoutes = require('./routes/onboarding');
const selfServiceRoutes = require('./routes/selfService');
const safetyRoutes = require('./routes/safety');
const leaveAccrualRoutes = require('./routes/leaveAccrual');
const directoryRoutes = require('./routes/directory');

function assertJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
}

function createApp() {
  assertJwtSecret();

  // 2. Initialize the app
  const app = express();
  app.set('trust proxy', 1); // fix express-rate-limit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on render

  const origins = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
    : false;

  // 3. Apply standard middleware
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: '12mb' }));

  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    redact: ['req.headers.authorization'],
  });
  
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
    })
  );

  app.get('/app-config.js', (req, res) => {
    res.type('application/javascript');
    const base = process.env.PUBLIC_API_BASE || '';
    res.setHeader('Cache-Control', 'no-store');
    res.send(`window.__AMD_API_BASE__=${JSON.stringify(base)};`);
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX || 50),
    standardHeaders: true,
    legacyHeaders: false,
  });

  // 4. Mount your routes INSIDE the createApp function
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/employee', employeeRoutes);
  app.use('/api/hr', hrRoutes);
  app.use('/api/checkouts', earlyCheckoutRoutes);
  app.use('/api/overtime', overtimeRoutes);
  app.use('/api/shifts', shiftRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/self-service', selfServiceRoutes);
  app.use('/api/safety', safetyRoutes);
  app.use('/api/leave-accrual', leaveAccrualRoutes);
  app.use('/api/directory', directoryRoutes);

  // 5. Health check and Static File serving
  app.get('/health', (req, res) => res.type('text').send('ok'));

  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  const legacyRoot = path.join(__dirname, '..');

  app.use(express.static(frontendDist));
  app.use('/assets', express.static(path.join(legacyRoot, 'assets')));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ msg: 'Not found' });
    const distIndex = path.join(frontendDist, 'index.html');
    const fs = require('fs');
    if (fs.existsSync(distIndex)) return res.sendFile(distIndex);
    res.sendFile(path.join(legacyRoot, 'index.html'));
  });

  return app;
}

module.exports = { createApp };
