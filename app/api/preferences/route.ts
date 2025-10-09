// app/api/preferences/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

type Body = Partial<{
  daily_checkin: boolean;
  weekly_summary: boolean;
  milestone_celebrations: boolean;
  marketing_emails: boolean;

  daily_checkin_time: string;  // "HH:mm"
  daily_checkin_days: string;  // "mon,tue,wed,thu,fri"
  weekly_summary_time: string; // "HH:mm"
  weekly_summary_day: string;  // "sun"
  timezone: string;            // IANA TZ
  channel_email: boolean;
  channel_inapp: boolean;
}>;

// Defaults used when INSERTing a brand-new row
const DEFAULTS: Required<Omit<Body, never>> = {
  daily_checkin: true,
  weekly_summary: true,
  milestone_celebrations: true,
  marketing_emails: false,

  daily_checkin_time: '09:00',
  daily_checkin_days: 'mon,tue,wed,thu,fri',
  weekly_summary_time: '17:00',
  weekly_summary_day: 'sun',
  timezone: 'UTC',
  channel_email: true,
  channel_inapp: true,
};

export async function GET() {
  const sb = supabaseServer();
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error: selErr } = await sb
    .from('preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (selErr && selErr.code !== 'PGRST116') {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  // If no row yet, return ephemeral defaults (don’t create here)
  return NextResponse.json(data ?? { user_id: user.id, ...DEFAULTS });
}

export async function POST(req: Request) {
  const sb = supabaseServer();

  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const incoming = (await req.json().catch(() => ({}))) as Body;

  // Build a minimal UPDATE payload with only defined keys
  const allowedKeys = [
    'daily_checkin',
    'weekly_summary',
    'milestone_celebrations',
    'marketing_emails',
    'daily_checkin_time',
    'daily_checkin_days',
    'weekly_summary_time',
    'weekly_summary_day',
    'timezone',
    'channel_email',
    'channel_inapp',
  ] as const;

  const updatePayload: Record<string, unknown> = {};
  for (const k of allowedKeys) {
    if (k in incoming && typeof (incoming as Record<string, unknown>)[k] !== 'undefined') {
      updatePayload[k] = (incoming as Record<string, unknown>)[k];
    }
  }

  // 1) Try UPDATE first (no-op if body empty, but cheap)
  const { data: updRows, error: updErr } = await sb
    .from('preferences')
    .update(updatePayload)
    .eq('user_id', user.id)
    .select('user_id'); // returns [] if nothing updated

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  if (updRows && updRows.length > 0) {
    return NextResponse.json({ ok: true, mode: 'updated' });
  }

  // 2) No row existed — INSERT with defaults + any provided overrides
  const insertPayload = {
    user_id: user.id,
    ...DEFAULTS,
    ...incoming, // merge overrides from client (safe keys only in table)
  };

  const { error: insErr } = await sb.from('preferences').insert(insertPayload);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, mode: 'inserted' });
}
