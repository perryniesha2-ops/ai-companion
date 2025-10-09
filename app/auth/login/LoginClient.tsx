'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const sb = useMemo(() => supabaseBrowser(), []);

  const next = params.get('next') || '/dashboard';
  const urlError = params.get('error') || params.get('error_description') || '';

  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(urlError || null);
  const [loading, setLoading] = useState(false);

  // compute origin only on client
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || '';

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@') || loading) return;

    setLoading(true);
    setErr(null);

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setErr(error.message || 'Failed to send magic link.');
      setLoading(false);
      return;
    }

    // Go to “check email” page with prefilled email + next
    router.replace(
      `/auth/check-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
    );
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={sendMagicLink} aria-busy={loading}>
        <h1 className="auth-title">Sign in</h1>
        <p className="muted" style={{ marginTop: 4, marginBottom: 8 }}>
          We’ll email you a magic link to sign in.
        </p>

        <label className="field">
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

        <button className="btn-grad" disabled={!email.includes('@') || loading} style={{ marginTop: 12 }}>
          {loading ? 'Sending…' : 'Email me a link'}
        </button>

        <p className="auth-alt" style={{ marginTop: 12 }}>
          Having trouble? <Link className="link" href="/auth/help">Get help</Link>
        </p>
      </form>
    </main>
  );
}
