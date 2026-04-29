import {
  getSql, verifyPassword, createSession, sessionCookie, json,
} from '../_lib/auth.js';

export const config = { runtime: 'edge' };

const DUMMY_HASH = 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const sql = getSql();
  if (!sql) return json({ error: 'Database not configured' }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const email = (body.email || '').toString().trim().toLowerCase().slice(0, 200);
  const password = (body.password || '').toString();
  if (!email || !password) return json({ error: 'Email and password are required' }, 400);

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
