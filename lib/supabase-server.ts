// lib/supabase-server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies as nextCookies } from 'next/headers';
import type { Database } from '@/types';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * For Route Handlers & Server Actions ONLY (cookie writes allowed)
 */
export function supabaseServer() {
  const store = nextCookies(); // mutable here
  return createServerClient<Database>(URL, ANON, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        store.set({ name, value, ...options });
      },
      remove(name: string, options?: CookieOptions) {
        store.delete({ name, ...options });
      },
    },
  });
}

/**
 * For Server Components (RSC) — read-only (NO cookie writes)
 * Prevents the “Cookies can only be modified …” error.
 */
export function supabaseRSC() {
  const store = nextCookies(); // read-only in RSC context
  return createServerClient<Database>(URL, ANON, {
    // Provide read-only cookie methods
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      // no-ops so Supabase doesn't crash if it tries to write
      // (and we also disable auto refresh below)
      set() {},
      remove() {},
    } as unknown as Parameters<typeof createServerClient>[2]['cookies'],
    // Avoid refresh/write attempts in RSC
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
