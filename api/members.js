import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'edge' };

export default async function handler() {
  if (!process.env.DATABASE_URL) {
    return json({ error: 'Database not configured' }, 500);
  }
  const sql = neon(process.env.DATABASE_URL);
  try {
    const rows = await sql`
      SELECT name, name_ar, tier, firm, city, city_ar, specialty, specialty_ar, since, color
      FROM members
      WHERE published = true
      ORDER BY since ASC, name ASC
    `;
    return json(rows, 200);
  } catch (err) {
    return json({ error: 'Database read failed', detail: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    },
  });
}
