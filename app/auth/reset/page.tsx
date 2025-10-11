'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [ready, setReady] = useState(false);   // true when recovery session is present
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // When the user clicks the email link, Supabase redirects here with a
  // recovery session (access_token in the URL hash). We wait for that:
  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getSession();
      setReady(!!data.session);
    })();
  }, [sb]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    if (pwd.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (pwd !== pwd2)   { setErr('Passwords do not match.'); return; }

    setBusy(true);
    setErr(null);
    setOk(null);

    const { error } = await sb.auth.updateUser({ password: pwd });
    if (error) {
      setErr(error.message || 'Failed to update password.');
      setBusy(false);
      return;
    }
    setOk('Password updated.');
    // Optional: redirect to login after a short pause
    setTimeout(() => router.replace('/auth/login?reset=1'), 900);
  }

  return (
    <main className="auth-shell">
      <form className="auth-card" onSubmit={onSubmit} aria-busy={busy}>
        <h1 className="auth-title">Reset your password</h1>
        {!ready && (
          <p className="muted" style={{ marginTop: 6 }}>
            Checking your reset link…
          </p>
        )}

        {ready && (
          <>
            <label className="field" style={{ marginTop: 12 }}>
              <div className="field-wrap">
                <span className="field-icon" aria-hidden>🔒</span>
                <input
                  className="input"
                  type="password"
                  placeholder="New password"
                  value={pwd}
                  onChange={(e) => setPwd(e.currentTarget.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>
            </label>

            <label className="field" style={{ marginTop: 8 }}>
              <div className="field-wrap">
                <span className="field-icon" aria-hidden>🔒</span>
                <input
                  className="input"
                  type="password"
                  placeholder="Confirm new password"
                  value={pwd2}
                  onChange={(e) => setPwd2(e.currentTarget.value)}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>
            </label>

            {err && <p className="auth-error" role="alert" style={{ marginTop: 10 }}>{err}</p>}
            {ok && <p className="muted" style={{ marginTop: 10 }}>{ok}</p>}

            <button className="btn-grad" disabled={!ready || busy} style={{ marginTop: 12 }}>
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </>
        )}

        <p className="auth-alt" style={{ marginTop: 12 }}>
          <Link className="link" href="/auth/login">Back to sign in</Link>
        </p>
      </form>
    </main>
  );
}
