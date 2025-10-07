// lib/supabase-server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types';
import { cookies as nextCookies } from 'next/headers';

/**
 * Synchronous creator usable only in Server Components / Route Handlers.
 * Works across Next/SSR versions where `cookies()` is typed as value or Promise.
 */
export function supabaseServer(): SupabaseClient<Database> {
  // Coerce to a callable that returns a cookie store (not a Promise).
  type CookieStore =
    | ReturnType<typeof nextCookies>
    | Awaited<ReturnType<typeof nextCookies>>;
  const getStore = nextCookies as unknown as () => CookieStore;
  const store = getStore() as any; // tolerate older/newer Next typings

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Supply the exact methods `@supabase/ssr` expects
      cookies: {
        get(name: string) {
          try {
            return store.get?.(name)?.value as string | undefined;
          } catch {
            return undefined;
          }
        },
        set(name: string, value: string, options?: CookieOptions) {
          try {
            // Next 13/14: .set(name, value, options)
            store.set?.(name, value, options);
          } catch {
            /* no-op in edge cases */
          }
        },
        remove(name: string, options?: CookieOptions) {
          try {
            // Delete via a zero maxAge for broad compatibility
            store.set?.(name, '', { ...(options ?? {}), maxAge: 0 });
          } catch {
            /* no-op */
          }
        },
      },
    }
  );
}
