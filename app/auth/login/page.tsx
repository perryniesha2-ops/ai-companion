'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sb = useMemo(() => supabaseBrowser(), []);

  const next = params.get('next') || '';
  const urlError = params.get('error') || params.get('error_description') || '';

  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (urlError) setErr(urlError); }, [urlError]);

  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const valid = email.includes('@') && pwd.length >= 8;

  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valid || loading) return;

    setLoading(true);
    setErr(null);

    const { error } = await sb.auth.signInWithPassword({ email, password: pwd });
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    const suffix = next ? `?next=${encodeURIComponent(next)}` : '';
    router.replace(`/start${suffix}`);
  }, [valid, loading, sb, email, pwd, router, next]);

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit} aria-busy={loading}>
        <h1 className="auth-title">Sign in</h1>

        <label className="field">
          <div className="field-wrap">
            <span className="field-icon" aria-hidden>📧</span>
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              autoComplete="email"
            />
          </div>
        </label>

        <label className="field">
          <div className="field-wrap">
            <span className="field-icon" aria-hidden>🔒</span>
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={pwd}
              onChange={(e) => setPwd(e.currentTarget.value)}
              required
              minLength={8}
              autoComplete="current-password"
            />
          </div>
        </label>

        {err && <p className="auth-error" role="alert">{err}</p>}

        <button className="btn-grad" disabled={!valid || loading}>
          {loading ? 'Signing in…' : 'Continue'}
        </button>

        <p className="auth-alt">
          No account?{' '}
          <Link
            href={`/auth/signup?next=${encodeURIComponent(next || '/onboarding')}`}
            className="link"
          >
            Create one
          </Link>
        </p>
      </form>
    </main>
  );
}
