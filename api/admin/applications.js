import { getSql, getCurrentUser, json } from '../_lib/auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const user = await getCurrentUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return json({ error: 'Forbidden' }, 403);

  const sql = getSql();
  if (!sql) return json({ error: 'Database not configured' }, 500);

  const rows = await sql`
    SELECT id, full_name, email, location, tier, experience, status, created_at
    FROM applications
    ORDER BY created_at DESC
    LIMIT 200
  `;
  return json({ applications: rows });
}
