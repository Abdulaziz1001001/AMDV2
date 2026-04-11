const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const https = require('https');
const http = require('http');
const Admin = require('./models/Admin');
require('dotenv').config();

const { createApp } = require('./app');

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is required');
  process.exit(1);
}

const app = createApp();

async function ensureBootstrapAdmin() {
  const bootPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const adminUsername = (process.env.ADMIN_BOOTSTRAP_USERNAME || 'admin').trim();
  const adminName = process.env.ADMIN_BOOTSTRAP_NAME || 'System Administrator';

  const adminExists = await Admin.findOne({ username: adminUsername });
  if (adminExists) return;

  if (!bootPassword || String(bootPassword).length < 8) {
    console.warn(
      'No admin account found and ADMIN_BOOTSTRAP_PASSWORD is missing or shorter than 8 characters — skipping bootstrap. Create an admin manually or set ADMIN_BOOTSTRAP_PASSWORD.'
    );
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(bootPassword, salt);
  await Admin.create({
    username: adminUsername,
    password: hashedPassword,
    name: adminName,
  });
  console.log(`Bootstrap admin created (username: ${adminUsername}). Change the password after first login.`);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    try {
      await ensureBootstrapAdmin();
    } catch (err) {
      console.error('Bootstrap admin error:', err);
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

if (process.env.ENABLE_KEEPALIVE === 'true') {
  const selfUrl = process.env.SELF_URL;
  if (!selfUrl) {
    console.warn('ENABLE_KEEPALIVE is true but SELF_URL is not set — keep-alive disabled');
  } else {
    const intervalMs = 14 * 60 * 1000;
    const ping = () => {
      const u = new URL(selfUrl);
      const lib = u.protocol === 'https:' ? https : http;
      lib
        .get(selfUrl, (r) => r.resume())
        .on('error', (e) => console.warn('Keep-alive ping failed:', e.message));
    };
    setInterval(ping, intervalMs);
    console.log('Keep-alive ping enabled for', selfUrl);
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
