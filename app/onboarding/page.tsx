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
// This is a client component because it uses useState and useEffect
// and it needs to be rendered immediately without waiting for server-side rendering
// to complete. This is important for the onboarding flow, which should be as fast
// and responsive as possible.