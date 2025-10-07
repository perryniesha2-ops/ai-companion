// app/chat/page.tsx
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';

const FREE_DAILY = 30;

type NameRow    = { name: string | null };
type PremiumRow = { is_premium: boolean | null };
type UsageRow   = { count: number };
type OnbRow     = { onboarding_complete: boolean | null };

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default async function ChatPage() {
  const sb = await supabaseServer();

  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/auth/login?next=%2Fchat');

  // Must finish onboarding first
  const { data: prof } = await sb
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', user.id)
    .returns<OnbRow[]>()
    .maybeSingle();

  if (!prof?.onboarding_complete) {
    redirect('/onboarding?next=%2Fchat');
  }

  // Read companion name + usage state
  const [{ data: comp }, { data: prem }, { data: usage }] = await Promise.all([
    sb.from('companions')
      .select('name')
      .eq('user_id', user.id)
      .returns<NameRow[]>()
      .maybeSingle(),
    sb.from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .returns<PremiumRow[]>()
      .maybeSingle(),
    sb.from('daily_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('day', todayStr())
      .returns<UsageRow[]>()
      .maybeSingle(),
  ]);

  const companionName = comp?.name ?? 'Companion';
  const isPremium     = !!prem?.is_premium;
  const used          = usage?.count ?? 0;
  const remaining     = isPremium ? Number.POSITIVE_INFINITY : Math.max(0, FREE_DAILY - used);

  // Pass initial state to the client UI
  const ChatClient = (await import('@/components/Chat/ChatClient')).default;
  return (
    <ChatClient
      companionName={companionName}
      isPremium={isPremium}
      remaining={Number.isFinite(remaining) ? (remaining as number) : -1}
      freeDaily={FREE_DAILY}
    />
  );
}
