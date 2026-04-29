import { getCurrentUser, testAuthEnabled, json } from '../_lib/auth.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const user = await getCurrentUser(req);
  const testMode = testAuthEnabled();
  if (!user) return json({ user: null, testMode });
  return json({
    user: { email: user.email, role: user.role, full_name: user.full_name },
    testMode,
  });
}
