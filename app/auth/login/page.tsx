// app/auth/login/page.tsx
import { Suspense } from 'react';
import LoginClient from './LoginClient';

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="auth-shell">
          <div className="auth-card"><p>Loading…</p></div>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
