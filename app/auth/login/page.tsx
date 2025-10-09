// app/auth/login/page.tsx
'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sb = useMemo(() => supabaseBrowser(), []);

  const next = params.get('next') || '/dashboard';
  const urlError = params.get('error') || params.get('error_description') || '';

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = email.includes('@');

  useEffect(() => { if (urlError) setErr(urlError); }, [urlError]);

  // Build redirect target for the magic link
  const origin = useMemo(
    () => (typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || ''),
    []
  );

  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!valid || sending) return;

    setSending(true);
    setErr(null);

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });

    setSending(false);
    if (error) {
      setErr(error.message);
      return;
    }

    router.replace(`/auth/check-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`);
  }, [valid, sending, sb, email, origin, next, router]);

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit} aria-busy={sending}>
        <h1 className="auth-title">Sign in with a magic link</h1>

        <label className="field">
          <div className="field-wrap">
            <span className="field-icon" aria-hidden>📧</span>
            <input
              className="input"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>
        </label>

        {err && <p className="auth-error" role="alert">{err}</p>}

        <button className="btn-grad" disabled={!valid || sending}>
          {sending ? 'Sending link…' : 'Email me a link'}
        </button>

        <p className="auth-alt">
          Need an account?{' '}
          <Link
            href={`/auth/login?next=${encodeURIComponent('/onboarding')}`}
            className="link"
          >
            Use the magic link above
          </Link>
        </p>
      </form>
    </main>
  );
}
