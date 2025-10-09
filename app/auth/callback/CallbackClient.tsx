'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const errParam =
        params.get('error_description') || params.get('error') || '';
      const next = params.get('next') || '/dashboard';

      if (errParam) {
        router.replace(`/auth/login?error=${encodeURIComponent(errParam)}`);
        return;
      }

      const sb = supabaseBrowser();

      // If we already have a session, jump to /start
      const { data: pre } = await sb.auth.getSession();
      if (pre.session) {
        router.replace(next ? `/start?next=${encodeURIComponent(next)}` : '/start');
        return;
      }

      // 1) Try PKCE/OAuth first (?code=…)
      const code = params.get('code') || undefined;
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next ? `/start?next=${encodeURIComponent(next)}` : '/start');
          return;
        }
        // Fall through to OTP if PKCE fails
      }

      // 2) Magic link / email OTP fallback (?token_hash=…&type=…)
      const token_hash = params.get('token_hash') || undefined;
      const type =
        (params.get('type') as
          | 'magiclink'
          | 'signup'
          | 'recovery'
          | 'invite'
          | 'email_change'
          | null) || 'magiclink';

      if (token_hash) {
        const { error } = await sb.auth.verifyOtp({ type, token_hash });
        if (!error) {
          router.replace(next ? `/start?next=${encodeURIComponent(next)}` : '/start');
          return;
        }
        router.replace(`/auth/login?error=${encodeURIComponent('Verification failed')}`);
        return;
      }

      // 3) Nothing usable in URL
      router.replace('/auth/login');
    })();
  }, [params, router]);

  return (
    <main className="auth-shell">
      <div className="auth-card"><p>Signing you in…</p></div>
    </main>
  );
}
