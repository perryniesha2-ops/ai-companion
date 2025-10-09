// app/onboarding/page.tsx
import { Suspense } from 'react';
import OnboardingClient from './OnboardingClient';

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="auth-shell">
          <div className="auth-card"><p>Loading…</p></div>
        </main>
      }
    >
      <OnboardingClient />
    </Suspense>
  );
}
