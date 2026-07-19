// POST /api/waitlist
// Body: { email: string, track: string }
// Persists to Vercel KV if configured; otherwise just logs (so the endpoint
// still works before you've set up storage — see README.md).

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, track } = req.body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required.' });
    }

    const entry = { email: email.trim().toLowerCase(), track: track || 'unspecified', ts: new Date().toISOString() };

    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      await kv.set(`waitlist:${entry.email}`, entry);
    } else {
      // KV not configured yet — signup is accepted but not persisted.
      // See README.md "Optional: persist the waitlist" to enable storage.
      console.log('Waitlist signup (KV not configured, not persisted):', entry);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('waitlist error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
}
