import {
  getSql, verifyPassword, createSession, sessionCookie, json,
  testAuthEnabled, TEST_CREDS, TEST_USER, TEST_TOKEN,
} from '../_lib/auth.js';

export const config = { runtime: 'edge' };

const DUMMY_HASH = 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const TEST_TTL_SEC = 60 * 60 * 24 * 14;

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const email = (body.email || '').toString().trim().toLowerCase().slice(0, 200);
  const password = (body.password || '').toString();
  if (!email || !password) return json({ error: 'Email and password are required' }, 400);

  // Demo / fallback credentials always work, regardless of DB configuration.
  // This keeps first-time setup and previews usable until a real admin user
  // is created via scripts/create-user.mjs.
  if (email === TEST_CREDS.email && password === TEST_CREDS.password) {
    return json(
      { ok: true, user: TEST_USER, testMode: true },
      200,
      { 'Set-Cookie': sessionCookie(TEST_TOKEN, TEST_TTL_SEC) }
    );
  }

  if (testAuthEnabled()) {
    return json({ error: 'Invalid email or password' }, 401);
  }

  const sql = getSql();
  if (!sql) return json({ error: 'Database not configured' }, 500);

  const rows = await sql`
    SELECT id, email, role, full_name, password_hash
    FROM users WHERE email = ${email} LIMIT 1
  `;
  const user = rows[0];
  // Run verifyPassword unconditionally to avoid timing-based user enumeration
  const ok = await verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) return json({ error: 'Invalid email or password' }, 401);

  const { token, expiresAt } = await createSession(sql, user.id);
  await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`;
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

  return json(
    { ok: true, user: { email: user.email, role: user.role, full_name: user.full_name } },
    200,
    { 'Set-Cookie': sessionCookie(token, maxAge) }
  );
}
