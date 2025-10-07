'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const errParam = params.get('error_description') || params.get('error');
      const code = params.get('code') || undefined;
      const token_hash = params.get('token_hash') || undefined; // present on email links
      // 'type' can be 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change'
      const type = (params.get('type') as
        | 'signup'
        | 'magiclink'
        | 'recovery'
        | 'invite'
        | 'email_change'
        | null) || 'magiclink';
      const next = params.get('next') || '';

      if (errParam) {
        router.replace(`/auth/login?error=${encodeURIComponent(errParam)}`);
        return;
      }

      const sb = supabaseBrowser();

      // 1) Try PKCE/code flow first (OAuth or new email code)
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (!error) {
          const suffix = next ? `?next=${encodeURIComponent(next)}` : '';
          router.replace(`/start${suffix}`);
          return;
        }
        // If we get the PKCE verifier error, fall through to OTP flow
        // (or any other error – we’ll try token_hash next).
      }

      // 2) Fallback for email links (OTP): token_hash + type
      if (token_hash) {
        const { error } = await sb.auth.verifyOtp({ type, token_hash });
        if (!error) {
          const suffix = next ? `?next=${encodeURIComponent(next)}` : '';
          router.replace(`/start${suffix}`);
          return;
        }
        router.replace(`/auth/login?error=${encodeURIComponent('Verification failed')}`);
        return;
      }

      // Nothing usable in URL
      router.replace('/auth/login');
    })();
  }, [params, router]);

  return (
    <main className="auth-shell">
      <div className="auth-card"><p>Signing you in…</p></div>
    </main>
  );
}
