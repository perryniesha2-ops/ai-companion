'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const sb = useMemo(() => supabaseBrowser(), []);

  // After signup we guide users to onboarding by default
  const next = params.get('next') || '/onboarding';

  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Only needed if email confirmations are ON
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || '';

  const canSubmit = email.includes('@') && pwd.length >= 8 && pwd === pwd2 && !loading;

  async function onSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErr(null);

    const { data, error } = await sb.auth.signUp({
      email,
      password: pwd,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setLoading(false);

    if (error) {
      setErr(error.message || 'Sign up failed.');
      return;
    }

    // If confirmations ON, session may be null until they click email link.
    if (!data.session) {
      router.replace(`/auth/check-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
      return;
    }

    // Otherwise session is live, go straight to /start (or next)
    router.replace(`/start?next=${encodeURIComponent(next)}`);
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSignup} aria-busy={loading}>
        <h1 className="auth-title">Create your account</h1>

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

        <label className="field" style={{ marginTop: 10 }}>
          <div className="field-wrap">
            <span className="field-icon" aria-hidden>🔒</span>
            <input
              className="input"
              type="password"
              placeholder="Password (min 8 chars)"
              value={pwd}
              onChange={(e) => setPwd(e.currentTarget.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </label>

        <label className="field" style={{ marginTop: 10 }}>
          <div className="field-wrap">
            <span className="field-icon" aria-hidden>✅</span>
            <input
              className="input"
              type="password"
              placeholder="Confirm password"
              value={pwd2}
              onChange={(e) => setPwd2(e.currentTarget.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </label>

        {pwd && pwd2 && pwd !== pwd2 && (
          <p className="auth-error" role="alert" style={{ marginTop: 8 }}>
            Passwords do not match.
          </p>
        )}

        {err && (
          <p className="auth-error" role="alert" style={{ marginTop: 8 }}>
            {err}
          </p>
        )}

        <button className="btn-grad" disabled={!canSubmit} style={{ marginTop: 12 }}>
          {loading ? 'Creating…' : 'Create account'}
        </button>

        <p className="auth-alt" style={{ marginTop: 12 }}>
          Already have an account?{' '}
          <Link className="link" href={`/auth/login?next=${encodeURIComponent(next)}`}>
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-shell">
          <div className="auth-card"><p>Loading…</p></div>
        </main>
      }
    >
      <SignupInner />
    </Suspense>
  );
}
