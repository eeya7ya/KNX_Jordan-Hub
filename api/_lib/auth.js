import { neon } from '@neondatabase/serverless';

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH_BITS  = 256;
const SESSION_TTL_MS    = 1000 * 60 * 60 * 24 * 14;
export const SESSION_COOKIE = 'knx_session';

function bytesToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function bytesToHex(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password),
    'PBKDF2', false, ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key, PBKDF2_HASH_BITS
  );
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToB64(salt)}$${bytesToB64(hash)}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iter = parseInt(parts[1], 10);
  if (!Number.isFinite(iter) || iter < 1000) return false;
  const salt = b64ToBytes(parts[2]);
  const expected = b64ToBytes(parts[3]);
  const actual = new Uint8Array(await pbkdf2(password, salt, iter));
  return constantTimeEqual(actual, expected);
}

export function generateSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashSessionToken(token) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return bytesToHex(buf);
}

export function parseCookies(req) {
  const header = req.headers.get('cookie') || '';
  const out = {};
  header.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i < 0) return;
    const k = p.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export function sessionCookie(token, maxAgeSec) {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ].join('; ');
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getSql() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

// --- Test mode (no DB required) ---
// Enable by setting TEST_AUTH=1 in the environment, OR automatically when
// DATABASE_URL is not set. Sign in with TEST_CREDS to get an admin session.
export const TEST_TOKEN = 'test-mode-session';
export const TEST_CREDS = { email: 'admin@test.com', password: 'test1234' };
export const TEST_USER  = { id: 0, email: TEST_CREDS.email, role: 'admin', full_name: 'Test Admin', testMode: true };

export function testAuthEnabled() {
  return process.env.TEST_AUTH === '1' || !process.env.DATABASE_URL;
}

export function isDemoUser(user) {
  return !!(user && (user.testMode === true || user.id === 0));
}

export async function getCurrentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  // Recognize the demo session even when a DB is configured so that fallback
  // sign-ins remain logged in across requests.
  if (token === TEST_TOKEN) return TEST_USER;
  const sql = getSql();
  if (!sql) return null;
  const tokenHash = await hashSessionToken(token);
  const rows = await sql`
    SELECT u.id, u.email, u.role, u.full_name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash} AND s.expires_at > NOW()
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function createSession(sql, userId) {
  const token = generateSessionToken();
  const tokenHash = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sql`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${tokenHash}, ${userId}, ${expiresAt.toISOString()})
  `;
  return { token, expiresAt };
}

export async function deleteSession(sql, token) {
  if (!token) return;
  const tokenHash = await hashSessionToken(token);
  await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}
