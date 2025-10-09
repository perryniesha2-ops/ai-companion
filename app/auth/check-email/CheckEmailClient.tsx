'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

const COOLDOWN_SEC = 25;

export default function CheckEmailClient() {
  const params = useSearchParams();
  const email = params.get('email') || '';
  const next  = params.get('next')  || '/dashboard';

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [left, setLeft] = useState<number>(COOLDOWN_SEC);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sb = useMemo(() => supabaseBrowser(), []);

  // Only compute origin on the client
  const origin = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL || '';

  // Cooldown timer
  useEffect(() => {
    if (left <= 0) return;
    timerRef.current = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [left]);

  // Guess inbox URL
  const inboxUrl = useMemo(() => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return '';
    if (domain.includes('gmail')) return 'https://mail.google.com';
    if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live'))
      return 'https://outlook.live.com/mail';
    if (domain.includes('yahoo')) return 'https://mail.yahoo.com';
    if (domain.includes('icloud') || domain.includes('me.com') || domain.includes('mac.com'))
      return 'https://www.icloud.com/mail';
    return '';
  }, [email]);

  async function resend() {
    if (!email) {
      setErr('Missing email address.');
      return;
    }
    if (left > 0) return;

    setErr(null);
    setOk(null);

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      },
    });

    if (error) {
      setErr(error.message || 'Failed to resend link.');
      return;
    }
    setOk('Magic link sent. Check your inbox.');
    setLeft(COOLDOWN_SEC);
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Check your email</h1>

        <p className="muted" style={{ marginTop: 6 }}>
          We sent a magic sign-in link to <strong>{email || 'your inbox'}</strong>.
          <br />Open it on this device to continue.
        </p>

        <div style={{ height: 14 }} />

        <div className="hstack" style={{ justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn-grad"
            onClick={resend}
            disabled={!email || left > 0}
            aria-disabled={!email || left > 0}
            title={!email ? 'No email provided' : left > 0 ? `Wait ${left}s` : 'Resend link'}
          >
            {left > 0 ? `Resend in ${left}s` : 'Resend link'}
          </button>

          {inboxUrl ? (
            <a className="btn btn--outline" href={inboxUrl} target="_blank" rel="noreferrer">
              Open inbox
            </a>
          ) : (
            <a className="btn btn--outline" href="mailto:" target="_blank" rel="noreferrer">
              Open mail app
            </a>
          )}

          <Link className="btn" href="/auth/login">
            Back
          </Link>
        </div>

        {(err || ok) && (
          <p className={`small ${err ? 'auth-error' : 'muted'}`} style={{ marginTop: 12 }}>
            {err || ok}
          </p>
        )}

        <p className="small muted" style={{ marginTop: 12 }}>
          Didn’t get it? Check spam, promotions, or try resending in a few seconds.
        </p>
      </div>
    </main>
  );
}
