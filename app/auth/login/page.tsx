// app/auth/login/page.tsx
'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

type OnbRow = { onboarding_complete: boolean | null };

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();

  // Where to go AFTER login if onboarding is already complete:
  const nextIfDone = params.get('next') || '/chat';

  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = email.includes('@') && pwd.length >= 8;

  const sb = useMemo(() => supabaseBrowser(), []);

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

    // Decide destination based on onboarding status
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      setErr('No session. Please try again.');
      setLoading(false);
      return;
    }

    // Narrow select + explicit return type to avoid TS “never”
    const { data: prof } = await sb
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .returns<OnbRow[]>()   // tell TS the shape
      .maybeSingle();

    const needsOnboarding = !prof?.onboarding_complete; // also true if no row yet
    router.replace(needsOnboarding ? '/onboarding?next=%2Fchat' : nextIfDone);
  }, [valid, loading, sb, email, pwd, router, nextIfDone]);

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
            />
          </div>
        </label>

        {err && <p className="auth-error" role="alert">{err}</p>}

        <button className="btn-grad" disabled={!valid || loading}>
          {loading ? 'Signing in…' : 'Continue'}
        </button>

        <p className="auth-alt">
          No account? <Link href={`/auth/signup?next=${encodeURIComponent('/onboarding')}`} className="link">Create one</Link>
        </p>
      </form>
    </main>
  );
}
