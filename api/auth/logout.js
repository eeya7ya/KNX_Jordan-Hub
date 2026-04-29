import {
  getSql, parseCookies, deleteSession, clearSessionCookie, json, SESSION_COOKIE,
} from '../_lib/auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const sql = getSql();
  const token = parseCookies(req)[SESSION_COOKIE];
  if (sql) await deleteSession(sql, token);
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}
