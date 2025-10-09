// app/auth/callback/page.tsx
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
      // Read query parameters Supabase may send
      const errParam = params.get('error_description') || params.get('error');
      const next = params.get('next') || '/dashboard';

      if (errParam) {
        router.replace(`/auth/login?error=${encodeURIComponent(errParam)}`);
        return;
      }

      const sb = supabaseBrowser();

      // If the session already exists (e.g., hash-based tokens were already processed), just go
      const { data: pre } = await sb.auth.getSession();
      if (pre.session) {
        const suffix = next ? `?next=${encodeURIComponent(next)}` : '';
        router.replace(`/start${suffix}`);
        return;
      }

      // 1) Try PKCE/OAuth first (e.g., ?code=...)
      const code = params.get('code') || undefined;
      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (!error) {
          const suffix = next ? `?next=${encodeURIComponent(next)}` : '';
          router.replace(`/start${suffix}`);
          return;
        }
        // If PKCE fails (common when the code verifier isn't present for magic links),
        // we fall through to the token_hash path.
      }

      // 2) Magic link / email OTP fallback (?token_hash=...&type=magiclink|signup|recovery|invite|email_change)
      const token_hash = params.get('token_hash') || undefined;
      // Supabase may send one of these types. Default to 'magiclink' if missing.
      const typeParam =
        (params.get('type') as
          | 'magiclink'
          | 'signup'
          | 'recovery'
          | 'invite'
          | 'email_change'
          | null) || 'magiclink';

      if (token_hash) {
        const { error } = await sb.auth.verifyOtp({ type: typeParam, token_hash });
        if (!error) {
          const suffix = next ? `?next=${encodeURIComponent(next)}` : '';
          router.replace(`/start${suffix}`);
          return;
        }
        router.replace(`/auth/login?error=${encodeURIComponent('Verification failed')}`);
        return;
      }

      // 3) Nothing usable in the URL — send back to login
      router.replace('/auth/login');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="auth-shell">
      <div className="auth-card"><p>Signing you in…</p></div>
    </main>
  );
}
