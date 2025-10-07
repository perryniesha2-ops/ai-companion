// app/start/page.tsx
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';

type Onb = { onboarding_complete: boolean | null };

export default async function StartPage({
  searchParams,
}: { searchParams?: { next?: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/auth/login?next=%2Fstart');

  const { data: prof } = await sb
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', user.id)
    .returns<Onb[]>()
    .maybeSingle();

  const needs = !prof?.onboarding_complete;
  const forward = searchParams?.next ? decodeURIComponent(searchParams.next) : '/dashboard';
  redirect(needs ? '/onboarding?next=%2Fdashboard' : forward);
}
