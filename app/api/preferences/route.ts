// app/api/preferences/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

type Body = Partial<{
  daily_checkin: boolean;
  weekly_summary: boolean;
  milestone_celebrations: boolean;
  marketing_emails: boolean;
}>;

export async function POST(req: Request) {
  const sb = supabaseServer();

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as Body;

  // Normalize to booleans (fallbacks here don’t matter much; we overwrite below)
  const next = {
    daily_checkin: !!body.daily_checkin,
    weekly_summary: !!body.weekly_summary,
    milestone_celebrations: !!body.milestone_celebrations,
    marketing_emails: !!body.marketing_emails,
    // If you want to stamp manually (optional; DB default also works)
    updatedat: new Date().toISOString(),
  };

  // Try UPDATE first
  const { data: updRows, error: updErr } = await sb
  .from('preferences')
  .update({
    daily_checkin: !!body.daily_checkin,
    weekly_summary: !!body.weekly_summary,
    milestone_celebrations: !!body.milestone_celebrations,
    marketing_emails: !!body.marketing_emails,
   // updatedat: new Date().toISOString(), // keep 'updatedat' spelling consistent with your DB
  })
  .eq('user_id', user.id)
  .select('user_id'); // <— only once

if (updErr) {
  return NextResponse.json({ error: updErr.message }, { status: 500 });
}

  // If no row, INSERT
  if (!updRows || updRows.length === 0) {
  const { error: insErr } = await sb.from('preferences').insert({
    user_id: user.id,
    daily_checkin: !!body.daily_checkin,
    weekly_summary: !!body.weekly_summary,
    milestone_celebrations: !!body.milestone_celebrations,
    marketing_emails: !!body.marketing_emails,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
}

return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: true });
}
