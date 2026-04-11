require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pino = require('pino');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');

function assertJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
}

function createApp() {
  assertJwtSecret();

  const app = express();

  const origins = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
    : false;

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

  app.use('/api/auth', authLimiter, require('./routes/auth'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/employee', require('./routes/employee'));

  app.get('/health', (req, res) => res.type('text').send('ok'));

  const staticRoot = path.join(__dirname, '..');
  app.get('/', (req, res) => {
    res.sendFile(path.join(staticRoot, 'index.html'));
  });
  app.use(express.static(staticRoot));

  return app;
}

module.exports = { createApp };
