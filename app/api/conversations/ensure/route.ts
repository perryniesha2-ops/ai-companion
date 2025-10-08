// app/api/conversations/ensure/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import type { Database } from '@/types';

type ConvRow = Database['public']['Tables']['conversations']['Row'];
type ConvInsert = Database['public']['Tables']['conversations']['Insert'];
type ConvId = Pick<ConvRow, 'id'>;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const sb = supabaseServer();
    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) return bad('Unauthorized', 401);

    const body = (await req.json().catch(() => null)) as { companion_id?: string | null } | null;
    if (!body) return bad('Invalid JSON');
    const companionId = body.companion_id ?? null;

    // Build the filterable query FIRST (no .returns() yet)
    let query = sb
      .from('conversations')
      .select('id')
      .eq('user_id', user.id);

    query = companionId
      ? query.eq('companion_id', companionId)
      : query.is('companion_id', null);

    // Now finish the query (order/limit) and resolve
    const { data: existing, error: findErr } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr && findErr.code !== 'PGRST116') {
      return bad(findErr.message, 500);
    }

    if (existing?.id) {
      return NextResponse.json({ id: (existing as ConvId).id, reused: true });
    }

    // Create a new conversation
    const insertPayload: ConvInsert = {
      user_id: user.id,
      companion_id: companionId,
      title: 'Chat',
      archived: false,
    };

    const { data: created, error: insErr } = await sb
      .from('conversations')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insErr || !created) {
      return bad(insErr?.message || 'Failed to create conversation', 500);
    }

    return NextResponse.json({ id: (created as ConvId).id, reused: false });
  } catch (e) {
    return bad((e as Error).message || 'Internal error', 500);
  }
}
