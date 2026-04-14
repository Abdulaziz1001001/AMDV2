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
    const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || '';
    res.setHeader('Cache-Control', 'no-store');
    res.send(
      `window.__AMD_API_BASE__=${JSON.stringify(base)};` +
      `window.__AMD_SUPABASE_URL__=${JSON.stringify(supabaseUrl)};` +
      `window.__AMD_SUPABASE_ANON_KEY__=${JSON.stringify(supabaseAnonKey)};`,
    );
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

  // 5. Health check and Static File serving
  app.get('/health', (req, res) => res.type('text').send('ok'));

  const staticRoot = path.join(__dirname, '..');
  app.get('/', (req, res) => {
    res.sendFile(path.join(staticRoot, 'index.html'));
  });
  app.use(express.static(staticRoot));

  return app;
}

module.exports = { createApp };
