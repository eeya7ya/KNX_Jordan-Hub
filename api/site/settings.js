import { getSql, getCurrentUser, testAuthEnabled, json } from '../_lib/auth.js';

export const config = { runtime: 'edge' };

const ALLOWED_KEYS = new Set([
  'event_count_month',
  'event_title',
  'event_date',
  'event_location',
  'event_format',
  'event_capacity',
  'event_status',
]);

const DEFAULTS = {
  event_count_month: '7',
  event_title: 'KNX Advanced · IP-Secure Commissioning',
  event_date: '24 May 2026 · 10:00 AGT',
  event_location: 'Amman · Royal Cultural Centre',
  event_format: 'Workshop · ETS6 lab',
  event_capacity: '32 seats',
  event_status: 'Registration open',
};

const memoryStore = new Map();

function readAll(sqlRows) {
  const out = { ...DEFAULTS };
  for (const r of sqlRows || []) {
    if (ALLOWED_KEYS.has(r.key)) out[r.key] = r.value;
  }
  for (const [k, v] of memoryStore) {
    if (ALLOWED_KEYS.has(k)) out[k] = v;
  }
  return out;
}

export default async function handler(req) {
  if (req.method === 'GET') {
    if (testAuthEnabled()) return json({ settings: readAll([]) });
    const sql = getSql();
    if (!sql) return json({ settings: DEFAULTS });
    const rows = await sql`SELECT key, value FROM site_settings`;
    return json({ settings: readAll(rows) });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const user = await getCurrentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (user.role !== 'admin') return json({ error: 'Forbidden' }, 403);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    const updates = body && typeof body === 'object' ? body : {};
    const clean = {};
    for (const k of Object.keys(updates)) {
      if (!ALLOWED_KEYS.has(k)) continue;
      const v = updates[k];
      if (v === null || v === undefined) continue;
      clean[k] = String(v).slice(0, 500);
    }
    if (!Object.keys(clean).length) return json({ error: 'No valid fields' }, 400);

    if (testAuthEnabled()) {
      for (const [k, v] of Object.entries(clean)) memoryStore.set(k, v);
      return json({ ok: true, settings: readAll([]) });
    }

    const sql = getSql();
    if (!sql) return json({ error: 'Database not configured' }, 500);
    for (const [k, v] of Object.entries(clean)) {
      await sql`
        INSERT INTO site_settings (key, value, updated_at)
        VALUES (${k}, ${v}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }
    const rows = await sql`SELECT key, value FROM site_settings`;
    return json({ ok: true, settings: readAll(rows) });
  }

  return json({ error: 'Method not allowed' }, 405);
}
