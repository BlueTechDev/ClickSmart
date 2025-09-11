export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { name, message } = req.body || {};
    const n = String(name || '').trim();
    const m = String(message || '').trim();
    if (!n || !m) return res.status(400).json({ error: 'Missing name or message' });
    if (n.length > 80 || m.length > 2000) return res.status(413).json({ error: 'Input too long' });

    const to = process.env.CONTACT_TO || 'krolljl@mlc-wels.edu';
    const provider = (process.env.MAIL_PROVIDER || 'none').toLowerCase();

    // Prefer Resend if configured (RESEND_API_KEY)
    if (provider === 'resend' && process.env.RESEND_API_KEY) {
      const payload = {
        from: process.env.MAIL_FROM || 'Click Smart <no-reply@clicksmart.local>',
        to: [to],
        subject: `New Question from ${n}`,
        text: `From: ${n}\n\n${m}`
      };
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        console.error('Resend error:', r.status, t);
        return res.status(502).json({ error: 'Email provider error' });
      }
      return res.status(200).json({ ok: true });
    }

    // If no provider configured, log and accept (so users aren’t blocked)
    console.log('[Contact] New message', { name: n, message: m.slice(0, 200) + (m.length > 200 ? '…' : '') });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Contact handler error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}

