import { supabaseServer } from './supabase-server';

export async function requireUser() {
  const sb = supabaseServer();
  const { data } = await sb.auth.getUser();
  return { user: data.user ?? null, error: data.user ? null : 'no_user' as const };
}

export function todayKey(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}
