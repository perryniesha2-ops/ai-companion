'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function CheckEmailPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const next = params.get('next') ?? '/onboarding';
  const sb = supabaseBrowser();

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? '');

  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function resend() {
    if (!email) return;
    setSending(true);
    setErr(null);
    setMsg(null);

    const { error } = await sb.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });

    setSending(false);
    if (error) setErr(error.message);
    else setMsg('Verification email sent. Please check your inbox.');
  }

  async function iveVerified() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) router.replace(next);
    else setErr("We haven’t detected a sign-in yet. Tap the link in your email to continue.");
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Check your email</h1>
        <p className="muted">
          We’ve sent a verification link to <strong>{email || 'your inbox'}</strong>.
          Click it to finish signing in.
        </p>

        {err && <p className="auth-error" role="alert">{err}</p>}
        {msg && <p className="muted">{msg}</p>}

        <div className="form-actions">
          <button className="btn-grad" onClick={resend} disabled={sending}>
            {sending ? 'Sending…' : 'Resend verification email'}
          </button>
          <button className="btn" onClick={iveVerified}>
            I’ve verified — continue
          </button>
          <a className="link center" href="https://mail.google.com" target="_blank" rel="noreferrer">
            Open Gmail
          </a>
        </div>

        <p className="auth-alt">
          Typed the wrong address?{' '}
          <Link className="link" href={`/auth/signup?next=${encodeURIComponent(next)}`}>
            Go back
          </Link>
        </p>
      </div>
    </main>
  );
}
