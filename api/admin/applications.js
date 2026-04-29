import { getSql, getCurrentUser, testAuthEnabled, json } from '../_lib/auth.js';

export const config = { runtime: 'edge' };

const MOCK_APPLICATIONS = [
  {
    id: 1, full_name: 'Marwa Al-Habashneh', email: 'marwa@example.com',
    location: 'Amman', tier: 'Professional',
    experience: 'Twelve years commissioning KNX systems for hospitality projects across the Levant.',
    status: 'pending', created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 2, full_name: 'Khalid Al-Tarawneh', email: 'khalid@example.com',
    location: 'Amman', tier: 'Tutor',
    experience: 'IP-secure commissioning lead at Helios Integrations; would teach the spring KNX Advanced course.',
    status: 'pending', created_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
  },
  {
    id: 3, full_name: 'Lina Khoury', email: 'lina@example.com',
    location: 'Aqaba', tier: 'Practitioner',
    experience: 'Hospitality lighting retrofits; ETS6 certified March 2024.',
    status: 'approved', created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

export default async function handler(req) {
  const user = await getCurrentUser(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return json({ error: 'Forbidden' }, 403);

  if (testAuthEnabled()) {
    return json({ applications: MOCK_APPLICATIONS });
  }

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
