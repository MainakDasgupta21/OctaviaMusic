const mongoose = require('mongoose');
const { connectToDatabase } = require('../src/db/connect');
const { User } = require('../src/models/User');

const normalizeUsername = (email) =>
  String(email || '')
    .split('@')[0]
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 24) || 'admin';

const run = async () => {
  const email = String(process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || '');

  if (!email || !password) {
    throw new Error(
      'ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD are required.',
    );
  }
  if (password.length < 8) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 8 characters.');
  }

  await connectToDatabase({ maxAttempts: 2 });

  const existing = await User.findOne({ email });
  if (!existing) {
    const user = await User.create({
      email,
      username: normalizeUsername(email),
      passwordHash: password,
      displayName: 'Admin',
      role: 'admin',
      settings: {
        displayName: 'Admin',
        email,
      },
    });
    console.log(`[seed-admin] Created admin user ${user.email}`);
  } else {
    existing.role = 'admin';
    existing.passwordHash = password;
    existing.displayName = existing.displayName || 'Admin';
    existing.settings = {
      ...(existing.settings?.toObject?.() || existing.settings || {}),
      displayName: existing.displayName || 'Admin',
      email,
    };
    await existing.save();
    console.log(`[seed-admin] Updated existing user ${existing.email} to admin`);
  }
};

run()
  .catch((error) => {
    console.error('[seed-admin] Failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
