// app/auth/callback/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

type OnbRow = { onboarding_complete: boolean | null };

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get('code');
    const err  = params.get('error_description') || params.get('error');
    const nextIfDone = params.get('next') || '/dashboard';
    const flow = (params.get('type') || '').toLowerCase();
    // Supabase often sets ?type=signup|recovery|magiclink|oauth on returns

    (async () => {
      if (err) return router.replace(`/auth/login?error=${encodeURIComponent(err)}`);
      if (!code) return router.replace('/auth/login');

      const sb = supabaseBrowser();

      // If it's clearly NOT an OAuth/magiclink flow, skip exchange and route to login.
      // We treat signup confirmation as "verified → please sign in".
      if (flow === 'signup' || flow === 'email_change') {
        router.replace(`/auth/login?verified=1&next=${encodeURIComponent(nextIfDone)}`);
        return;
      }

      // Try PKCE exchange (OAuth/magic link)
      const { error: exchErr } = await sb.auth.exchangeCodeForSession(code);

      // If the library complains about "code verifier", it's not a PKCE flow -> send to login.
      if (exchErr && /code verifier|invalid request/i.test(exchErr.message)) {
        router.replace(`/auth/login?verified=1&next=${encodeURIComponent(nextIfDone)}`);
        return;
      }
      if (exchErr) {
        router.replace(`/auth/login?error=${encodeURIComponent(exchErr.message)}`);
        return;
      }

      // We have a session (OAuth/magic-link). Check onboarding and route.
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return router.replace('/auth/login');

      const { data: prof } = await sb
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', user.id)
        .returns<OnbRow[]>()
        .maybeSingle();

      const needsOnboarding = !prof?.onboarding_complete;
      router.replace(needsOnboarding
        ? `/onboarding?next=${encodeURIComponent(nextIfDone)}`
        : nextIfDone
      );
    })();
  }, [params, router]);

  return (
    <main className="auth-shell">
      <div className="auth-card"><p>Signing you in…</p></div>
    </main>
  );
}
