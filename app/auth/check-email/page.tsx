// app/auth/check-email/page.tsx
import { Suspense } from 'react';
import CheckEmailClient from './CheckEmailClient';

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="auth-shell">
          <div className="auth-card"><p>Loading…</p></div>
        </main>
      }
    >
      <CheckEmailClient />
    </Suspense>
  );
}
