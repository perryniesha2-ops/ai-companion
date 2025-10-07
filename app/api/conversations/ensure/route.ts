import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const sb = supabaseServer();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const { companion_id }: { companion_id?: string | null } = await req.json().catch(() => ({}));

  // find latest active conversation for this user (+ optional companion)
  let q = sb
    .from('conversations')
    .select('id, archived')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (companion_id) q = q.eq('companion_id', companion_id);

  const { data: existing, error: selErr } = await q.maybeSingle();
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  if (existing) {
    return NextResponse.json({ id: existing.id });
  }

  // create a new one
  const insertPayload = {
    user_id: userId,
    title: 'Chat',
    companion_id: companion_id ?? null,
    archived: false,
  };

  const { data: created, error: insErr } = await sb
    .from('conversations')
    .insert([insertPayload])
    .select('id')
    .single();

  if (insErr || !created) {
    return NextResponse.json({ error: insErr?.message || 'Failed to create' }, { status: 500 });
  }

  return NextResponse.json({ id: created.id });
}
