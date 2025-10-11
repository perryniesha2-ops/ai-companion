'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

type OnbRow = { onboarding_complete: boolean | null };

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const sb = useMemo(() => supabaseBrowser(), []);

  const next = params.get('next') || '/dashboard';
  const urlError = params.get('error') || params.get('error_description') || '';

  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlError) setErr(urlError);
  }, [urlError]);

  const canSubmit = email.includes('@') && pwd.length >= 8 && !loading;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErr(null);

    const { error } = await sb.auth.signInWithPassword({ email, password: pwd });
    if (error) {
      setErr(error.message || 'Sign in failed.');
      setLoading(false);
      return;
    }

    // Decide destination by onboarding status
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      setErr('No session. Please try again.');
      setLoading(false);
      return;
    }

    const { data: prof } = await sb
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .returns<OnbRow[]>()
      .maybeSingle();

    const needsOnboarding = !prof?.onboarding_complete;
    router.replace(needsOnboarding ? `/onboarding?next=${encodeURIComponent(next)}` : next);
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit} aria-busy={loading}>
        <h1 className="auth-title">Sign in</h1>
        <p className="muted" style={{ marginTop: 4, marginBottom: 8 }}>
          Use your email and password.
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
              autoComplete="current-password"
            />
          </div>
        </label>

        {err && (
          <p className="auth-error" role="alert" style={{ marginTop: 10 }}>
            {err}
          </p>
        )}
<p className="auth-alt" style={{ marginTop: 10 }}>
  <Link className="link" href="/auth/forgot">Forgot password?</Link>
  <span className="sep"> • </span>
  <Link className="link" href="/auth/help">Need help?</Link>
</p>
        <button className="btn-grad" disabled={!canSubmit} style={{ marginTop: 12 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="auth-alt" style={{ marginTop: 12 }}>
          New here?{' '}
          <Link className="link" href={`/auth/signup?next=${encodeURIComponent('/onboarding')}`}>
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="auth-shell">
        <div className="auth-card"><p>Loading…</p></div>
      </main>
    }>
      <LoginInner />
    </Suspense>
  );
}
