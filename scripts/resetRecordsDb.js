/**
 * Drops attendance-related collections for a fresh start (test data discard).
 * Usage from repo root: node scripts/resetRecordsDb.js
 */
const path = require('path');
const backendRoot = path.join(__dirname, '..', 'backend');
require(path.join(backendRoot, 'node_modules', 'dotenv')).config({
  path: path.join(__dirname, '..', '.env'),
});
const mongoose = require(path.join(backendRoot, 'node_modules', 'mongoose'));

async function dropIfExists(db, name) {
  try {
    await db.dropCollection(name);
    console.log(`Dropped collection: ${name}`);
  } catch (err) {
    if (err && (err.code === 26 || err.codeName === 'NamespaceNotFound')) {
      console.log(`Skip (not found): ${name}`);
      return;
    }
    throw err;
  }
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is required');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  await dropIfExists(db, 'records');
  await dropIfExists(db, 'attendancerecords');
  await mongoose.disconnect();
  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
