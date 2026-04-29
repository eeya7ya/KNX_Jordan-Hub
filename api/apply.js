import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'edge' };

const TIERS = new Set(['Apprentice', 'Practitioner', 'Professional', 'Tutor', 'Fellow']);

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }
  if (!process.env.DATABASE_URL) {
    return json({ error: 'Database not configured' }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const full_name = (body.full_name || '').toString().trim().slice(0, 200);
  const email = (body.email || '').toString().trim().toLowerCase().slice(0, 200);
  const location = (body.location || '').toString().trim().slice(0, 200);
  const tier = (body.tier || '').toString().trim();
  const experience = (body.experience || '').toString().trim().slice(0, 5000);

  if (!full_name) return json({ error: 'Full name is required' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'A valid work email is required' }, 400);
  if (tier && !TIERS.has(tier)) return json({ error: 'Invalid tier' }, 400);

  const sql = neon(process.env.DATABASE_URL);
  try {
    const rows = await sql`
      INSERT INTO applications (full_name, email, location, tier, experience)
      VALUES (${full_name}, ${email}, ${location}, ${tier}, ${experience})
      RETURNING id, created_at
    `;
    return json({ ok: true, id: rows[0].id, created_at: rows[0].created_at }, 201);
  } catch (err) {
    return json({ error: 'Database write failed', detail: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
