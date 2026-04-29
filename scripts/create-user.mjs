#!/usr/bin/env node
// Create or update a user account.
// Usage:
//   DATABASE_URL=... node scripts/create-user.mjs <email> <password> [full_name] [role]
// Role defaults to "member"; use "admin" to grant admin access.

import { neon } from '@neondatabase/serverless';
import { hashPassword } from '../api/_lib/auth.js';

const [, , emailArg, password, fullName, role = 'member'] = process.argv;

if (!emailArg || !password) {
  console.error('Usage: node scripts/create-user.mjs <email> <password> [full_name] [role]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in the environment.');
  process.exit(1);
}

const email = emailArg.toLowerCase();
const sql = neon(process.env.DATABASE_URL);
const hash = await hashPassword(password);

await sql`
  INSERT INTO users (email, password_hash, full_name, role)
  VALUES (${email}, ${hash}, ${fullName || null}, ${role})
  ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name     = COALESCE(EXCLUDED.full_name, users.full_name),
    role          = EXCLUDED.role
`;

console.log(`User ${email} saved with role "${role}".`);
