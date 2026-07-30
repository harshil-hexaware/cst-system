'use strict';

/**
 * One-time bootstrap script: creates the very first ADMIN account.
 *
 * This is intentionally the ONLY path that can create an ADMIN.
 * The public /api/auth/register endpoint always creates a CUSTOMER,
 * and PATCH /api/users/:userId/role explicitly rejects "ADMIN" as a
 * target role for every caller, including existing admins (see
 * user-service/src/services/userService.js). That closes the loop
 * where a compromised or buggy API path could mint infinite admins.
 *
 * Usage (from services/auth-service, with DB env vars set — same
 * ones the service itself uses):
 *   ADMIN_EMAIL=you@example.com \
 *   ADMIN_PASSWORD='Str0ng!Passw0rd' \
 *   ADMIN_FIRST_NAME=Jane \
 *   ADMIN_LAST_NAME=Doe \
 *   node scripts/seedAdmin.js
 *
 * Or via docker compose, from the project root:
 *   docker compose run --rm \
 *     -e ADMIN_EMAIL=you@example.com \
 *     -e ADMIN_PASSWORD='Str0ng!Passw0rd' \
 *     -e ADMIN_FIRST_NAME=Jane \
 *     -e ADMIN_LAST_NAME=Doe \
 *     auth-service node scripts/seedAdmin.js
 *
 * Idempotent: if the email already exists, it prints the existing
 * user's current role and exits without making changes (use
 * --force to overwrite an existing account's role to ADMIN instead).
 */

const bcrypt = require('bcrypt');
const { sequelize, connectWithRetry } = require('../src/config/database');
const User = require('../src/models/User');
const config = require('../src/config/env');
const { ROLE_IDS } = require('../src/domain/roles');

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])(?!.*\s).{10,}$/;

function readArgs() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const firstName = process.env.ADMIN_FIRST_NAME || 'System';
  const lastName = process.env.ADMIN_LAST_NAME || 'Administrator';
  const force = process.argv.includes('--force');

  if (!email || !password) {
    // eslint-disable-next-line no-console
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required. See header comment for usage.');
    process.exit(1);
  }
  if (!PASSWORD_PATTERN.test(password)) {
    // eslint-disable-next-line no-console
    console.error('ADMIN_PASSWORD does not meet the password policy: 10+ chars, upper, lower, digit, special char, no whitespace.');
    process.exit(1);
  }
  return {
    email: email.toLowerCase(), password, firstName, lastName, force,
  };
}

async function seedAdmin() {
  const {
    email, password, firstName, lastName, force,
  } = readArgs();

  await connectWithRetry(5, 2000);

  const existing = await User.findOne({ where: { email } });

  if (existing && !force) {
    // eslint-disable-next-line no-console
    console.log(`User ${email} already exists with role_id=${existing.roleId}. Re-run with --force to overwrite to ADMIN, or use the app's normal role-promotion flow.`);
    await sequelize.close();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
  const t = await sequelize.transaction();

  try {
    let user;
    if (existing) {
      await existing.update({ passwordHash, roleId: ROLE_IDS.ADMIN, isActive: true }, { transaction: t });
      user = existing;
    } else {
      user = await User.create({
        email, passwordHash, roleId: ROLE_IDS.ADMIN, isActive: true,
      }, { transaction: t });
    }

    // user_profiles is owned by user-service, but lives in the same
    // physical DB for this MVP (see database/init.sql notes) — the
    // bootstrap script writes it directly so the admin has a working
    // profile even before RabbitMQ / user-service are up, since this
    // is meant to run as the very first step of a fresh deployment.
    await sequelize.query(
      `INSERT INTO user_profiles (id, user_id, email, role, first_name, last_name, is_active, created_at, updated_at)
       VALUES (uuid_generate_v4(), :userId, :email, 'ADMIN', :firstName, :lastName, true, now(), now())
       ON CONFLICT (user_id) DO UPDATE SET role = 'ADMIN', is_active = true, updated_at = now()`,
      {
        replacements: {
          userId: user.id, email, firstName, lastName,
        },
        transaction: t,
      },
    );

    await t.commit();
    // eslint-disable-next-line no-console
    console.log(`Admin account ready: ${email} (id=${user.id}). You can now log in via POST /api/auth/login.`);
  } catch (err) {
    await t.rollback();
    throw err;
  } finally {
    await sequelize.close();
  }
}

seedAdmin().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to seed admin:', err.message);
  process.exit(1);
});
