import { NextResponse } from 'next/server';

const SUPPORT_TO   = process.env.SUPPORT_TO!;   // e.g. "support@yourdomain.com"
const SUPPORT_FROM = process.env.SUPPORT_FROM!; // e.g. "Companion Support <support@yourdomain.com>"
const RESEND_API   = process.env.RESEND_API_KEY; // https://resend.com

type Body = {
  email: string;
  subject: string;
  message: string;
  name?: string;
  hp?: string; // honeypot
};

export async function POST(req: Request) {
  try {
    const { email, subject, message, name, hp } = (await req.json()) as Body;

    // Basic validation
    if (hp) return NextResponse.json({ ok: true });            // honeypot trip
    if (!email || !subject || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (!SUPPORT_TO || !SUPPORT_FROM || !RESEND_API) {
      return NextResponse.json({ error: 'Support mail not configured' }, { status: 500 });
    }

    // Build simple HTML/text
    const safe = (s: string) => s.replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]!));
    const html = `
      <div style="font-family:ui-sans-serif;line-height:1.5">
        <p><strong>From:</strong> ${safe(name || '')} &lt;${safe(email)}&gt;</p>
        <p><strong>Subject:</strong> ${safe(subject)}</p>
        <p style="white-space:pre-wrap">${safe(message)}</p>
      </div>
    `;
    const text = `From: ${name || ''} <${email}>\nSubject: ${subject}\n\n${message}`;

    // Send via Resend
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SUPPORT_FROM,
        to: [SUPPORT_TO],
        reply_to: email,
        subject: `[Support] ${subject}`,
        html,
        text,
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return NextResponse.json({ error: err?.message || 'Failed to send' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
