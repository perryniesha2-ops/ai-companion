'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function ForgotPasswordPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || '';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@') || busy) return;
    setBusy(true);
    setErr(null);
    setOk(null);

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/reset`,
    });

    if (error) {
      setErr(error.message || 'Failed to send reset email.');
    } else {
      setOk('Reset link sent. Check your inbox.');
    }
    setBusy(false);
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit} aria-busy={busy}>
        <h1 className="auth-title">Forgot password</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Enter your email and we’ll send you a password reset link.
        </p>

        <label className="field" style={{ marginTop: 12 }}>
          <div className="field-wrap">
            <span className="field-icon" aria-hidden>📧</span>
            <input
              className="input"
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              autoComplete="email"
            />
          </div>
        </label>

        {err && <p className="auth-error" role="alert" style={{ marginTop: 10 }}>{err}</p>}
        {ok && <p className="muted" style={{ marginTop: 10 }}>{ok}</p>}

        <button className="btn-grad" disabled={!email.includes('@') || busy} style={{ marginTop: 12 }}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>

        <p className="auth-alt" style={{ marginTop: 12 }}>
          <Link className="link" href="/auth/login">Back to sign in</Link>
        </p>
      </form>
    </main>
  );
}
