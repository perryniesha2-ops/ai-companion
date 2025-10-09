// app/start/page.tsx
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';

export default async function StartPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/auth/login');

  // 1) Ensure profile row exists (RLS-safe select first)
  const { data: prof } = await sb
    .from('profiles')
    .select('id, onboarding_complete')
    .eq('id', user.id)
    .maybeSingle();

  if (!prof) {
    // Create a minimal profile row for this user
    const { error: insErr } = await sb.from('profiles').insert({ id: user.id });
    if (insErr) {
      // If you hit RLS here, see policy below
      console.error('insert profile failed', insErr);
      redirect('/auth/login?error=profile-insert');
    }
  }

  // 2) Optionally ensure a companion (so chat works immediately)
  //    If you don’t want this auto-create, remove this block.
  await fetch('/api/companion/ensure', { method: 'POST', headers: { /* cookie-based auth ok */ } })
    .catch(() => { /* best effort; ignore */ });

  // 3) Re-read profile for the flag (or rely on prof)
  const { data: prof2 } = await sb
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', user.id)
    .maybeSingle();

  if (!prof2?.onboarding_complete) {
    redirect(`/onboarding?next=${encodeURIComponent('/dashboard')}`);
  }

  redirect('/dashboard');
}
