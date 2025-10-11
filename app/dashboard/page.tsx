// app/dashboard/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseRSC } from '@/lib/supabase-server';
import type { Database } from '@/types';
import DashboardTabs, { OverviewData } from '@/components/dashboard/DashboardTabs';
import Signout from '@/components/menus/Signout';


const FREE_DAILY = 30;

type OnbRow = {
  onboarding_complete: boolean | null;
  is_premium: boolean | null;
  nickname: string | null;
  created_at: string;
};
type UsageRow = { count: number };
type CreatedRow = Pick<Database['public']['Tables']['messages']['Row'], 'created_at'>;
type MemoryRow = Pick<Database['public']['Tables']['memories']['Row'], 'content'>;

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((+b - +a) / 86400000));
}
function topicsFrom(contents: string[]) {
  const buckets: Record<string, number> = { Work: 0, Relationships: 0, Goals: 0, Hobbies: 0 };
  const total = contents.length || 1;
  for (const c of contents) {
    const t = c.toLowerCase();
    if (/(work|job|career|project)/.test(t)) buckets.Work++;
    if (/(relationship|partner|dating|love|family)/.test(t)) buckets.Relationships++;
    if (/(goal|plan|improve|habit|learn|growth)/.test(t)) buckets.Goals++;
    if (/(hobby|music|game|sport|travel|art)/.test(t)) buckets.Hobbies++;
  }
  return Object.entries(buckets).map(([label, n]) => ({
    label,
    pct: Math.round((n / total) * 100),
  }));
}
function last7DayActivity(stamps: string[]): number[] {
  const map = new Map<string, number>();
  for (const s of stamps) {
    const d = s.slice(0, 10);
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  const today = new Date();
  const out: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push(map.get(key) ?? 0);
  }
  return out;
}
function streakFromDates(stamps: string[]) {
  const set = new Set(stamps.map((s) => s.slice(0, 10)));
  const today = new Date();
  let s = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (set.has(d.toISOString().slice(0, 10))) s++;
    else break;
  }
  return s;
}


 


export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: 'overview' | 'companion' | 'settings' | 'billing' };
}) {
const sb = supabaseRSC();

const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/auth/login?next=%2Fdashboard');

  const { data: prof } = await sb
    .from('profiles')
    .select('onboarding_complete, is_premium, nickname, created_at')
    .eq('id', user.id)
    .returns<OnbRow[]>()
    .maybeSingle();

  if (!prof?.onboarding_complete) {
    redirect('/onboarding?next=%2Fdashboard');
  }

  const [
    { data: usageRow },
    { data: firstRows },
    { count: totalMsgs },
    { data: recentMsgDates },
    { data: recentMems },
  ] = await Promise.all([
    sb
      .from('daily_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('day', new Date().toISOString().slice(0, 10))
      .returns<UsageRow[]>()
      .maybeSingle(),
    sb
      .from('messages')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .returns<CreatedRow[]>(),
    sb.from('messages').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    sb
      .from('messages')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(600)
      .returns<CreatedRow[]>(),
    sb
      .from('memories')
      .select('content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)
      .returns<MemoryRow[]>(),
  ]);

  const used = usageRow?.count ?? 0;
  const firstISO = firstRows?.[0]?.created_at ?? prof.created_at ?? user.created_at;
  const daysTogether = daysBetween(new Date(firstISO), new Date());
  const streak = streakFromDates((recentMsgDates ?? []).map((r) => r.created_at));
  const bestStreak = Math.max(streak, 7);
  const topics = topicsFrom((recentMems ?? []).map((m) => m.content));
  const activity = last7DayActivity((recentMsgDates ?? []).map((r) => r.created_at));
  const avgPerDay = Number(((totalMsgs ?? 0) / Math.max(daysTogether, 1)).toFixed(1));
  const isPremium = !!prof?.is_premium;

  const overview: OverviewData = {
    used,
    freeDaily: FREE_DAILY,
    totalMsgs: totalMsgs ?? 0,
    daysTogether,
    streak,
    bestStreak,
    topics,
    activity,
    avgPerDay,
    isPremium,
    userEmail: user.email ?? '',
    name: prof?.nickname ?? 'Companion',
    sinceISO: firstISO,
  };

  const initialTab = searchParams?.tab ?? 'overview';

  return (
    <main className="dash-shell">
      <div className="dash-container">
        {/* Top header */}
        <header className="dash-top">
          <div className="dash-left">
            <div className="avatar"><span className="heart">♡</span></div>
            <div className="dash-title">
              <div className="name">Dashboard</div>

              <div className="muted small">{user.email}</div>
            </div>
          </div>
           <div className="promo-right ml-auto">
                  <Signout />
                  </div>
        </header>

        {/* Compact promo */}
        <section className="promo" style={{ marginTop: 10 }}>
          <div className="promo-copy">
            <h3 className="promo-title">Upgrade to Premium</h3>
            <p className="promo-sub">Get unlimited messages for just $9.99/month.</p>
          </div>
          <div className="promo-right">
            <span className="promo-title">{Math.min(used, FREE_DAILY)}/{FREE_DAILY} today</span>
          </div>
        </section>

        {/* Tabs + content */}
        <DashboardTabs initialTab={initialTab} overview={overview} />
      </div>
    </main>
  );
}
