'use client';

import Link from 'next/link';

export default function AuthHelpPage() {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Need help?</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          A few things to try if you’re stuck signing in:
        </p>

        <ul className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          <li>Check spam/promotions for emails.</li>
          <li>Try a different browser, or disable extensions temporarily.</li>
          <li>If you used email/password, use “Forgot password” to reset.</li>
          <li>For Google login issues, confirm you’re signed into the correct Google account.</li>
        </ul>

        <div style={{ height: 12 }} />

        <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn" href="/auth/login">Back to sign in</Link>
          <a className="btn btn--outline" href="mailto:support@codesmithapp.com">Email support</a>
          <a className="btn btn--outline" href="https://status.supabase.com" target="_blank" rel="noreferrer">Service status</a>
        </div>
      </div>
    </main>
  );
}
