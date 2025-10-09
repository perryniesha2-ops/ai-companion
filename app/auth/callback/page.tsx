// app/auth/callback/page.tsx
import { Suspense } from 'react';
import CallbackClient from './CallbackClient';

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="auth-shell">
          <div className="auth-card"><p>Signing you in…</p></div>
        </main>
      }
    >
      <CallbackClient />
    </Suspense>
  );
}
