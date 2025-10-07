'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();

  // If caller passes ?next=/something, use it; otherwise onboard by default.
  const nextPath = params.get('next') || '/onboarding';

  // Local state
  const [email, setEmail] = useState<string>('');
  const [pwd, setPwd] = useState<string>('');
  const [showPwd, setShowPwd] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  // Basic validation
  const valid = email.includes('@') && pwd.length >= 8;

  // Build a stable origin for redirects (works in dev/prod)
  const origin = useMemo(() => {
    if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
    return process.env.NEXT_PUBLIC_SITE_URL || '';
  }, []);

  // Pre-create a stable Supabase client
  const sb = useMemo(() => supabaseBrowser(), []);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!valid || loading) return;

      setLoading(true);
      setErr(null);

      try {
        // Always include ?next=... so the callback knows where to send users
        const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

        const { data, error } = await sb.auth.signUp({
          email,
          password: pwd,
          options: { emailRedirectTo },
        });

        if (error) {
          setErr(error.message);
          setLoading(false);
          return;
        }

        // If email confirmations are ON, there is no session yet: send to a "check your email" page.
        if (!data.session) {
          router.replace(
            `/auth/check-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(nextPath)}`
          );
          return;
        }

        // If confirmations are OFF (or magic link returned a session), go directly to nextPath.
        router.replace(nextPath);
      } catch (e) {
        setErr((e as Error).message || 'Something went wrong. Please try again.');
        setLoading(false);
      }
    },
    [valid, loading, origin, nextPath, sb, email, pwd, router]
  );

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit} aria-busy={loading}>
        <h1 className="auth-title">Create Account</h1>

        <label className="field">
          <span className="sr-only">Email</span>
          <div className="field-wrap">
            <span className="field-icon" aria-hidden>
              📧
            </span>
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              autoComplete="email"
              required
              inputMode="email"
            />
          </div>
        </label>

        <label className="field">
          <span className="sr-only">Password</span>
          <div className="field-wrap">
            <span className="field-icon" aria-hidden>
              🔒
            </span>
            <input
              className="input"
              type={showPwd ? 'text' : 'password'}
              placeholder="Password (min 8 chars)"
              value={pwd}
              onChange={(e) => setPwd(e.currentTarget.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              type="button"
              className="field-toggle"
              onClick={() => setShowPwd((s) => !s)}
              aria-pressed={showPwd}
            >
              {showPwd ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        {err && (
          <p className="auth-error" role="alert">
            {err}
          </p>
        )}

        <button className="btn-grad" disabled={!valid || loading}>
          {loading ? 'Creating…' : 'Continue'}
        </button>

        <p className="auth-note small">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="link">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="link">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="auth-alt">
          Already have an account?{' '}
          <Link href={`/auth/login?next=${encodeURIComponent(nextPath)}`} className="link">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
