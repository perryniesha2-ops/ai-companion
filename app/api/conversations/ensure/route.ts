// app/api/conversations/ensure/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import type { ConversationsRow, TablesInsert } from '@/types';

type Body = { companion_id?: string | null };

export async function POST(req: Request) {
  const sb = supabaseServer();

  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let companionId: string | null = null;
  try {
    const parsed = (await req.json()) as Body;
    companionId = parsed?.companion_id ?? null;
  } catch {
    // ignore bad/empty JSON; treat as no companion filter
  }

  // Try to reuse the most recent conversation for the user.
  // If your schema has a 'companion_id' column, we filter by it.
  // If not, we fall back to "latest conversation for user".
  let existingId: string | null = null;

  // Attempt WITH companion_id
  if (companionId !== undefined) {
    const { data: maybeExisting, error: findErr } = await sb
      .from('conversations')
      .select('id')
      .eq('companion_id', companionId) // will error if column doesn't exist
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<Pick<ConversationsRow, 'id'>[]>()
      .maybeSingle();

    if (findErr?.code === '42703') {
      // Column doesn't exist -> fall through to generic lookup
    } else if (findErr) {
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    } else if (maybeExisting?.id) {
      existingId = maybeExisting.id;
    }
  }

  // Fallback: just reuse the latest conversation for this user
  if (!existingId) {
    const { data: latest, error: latestErr } = await sb
      .from('conversations')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .returns<Pick<ConversationsRow, 'id'>[]>()
      .maybeSingle();

    if (latestErr && latestErr.code !== 'PGRST116') {
      return NextResponse.json({ error: latestErr.message }, { status: 500 });
    }
    if (latest?.id) {
      existingId = latest.id;
    }
  }

  if (existingId) {
    return NextResponse.json({ id: existingId, reused: true });
  }

  // Create a new conversation.
  // Only include fields that you *know* exist in your schema.
  const insertPayload: TablesInsert<'conversations'> = {
    user_id: user.id,
    title: 'Chat',
    // DO NOT add companion_id unless your Database types include it.
  };

  const { data: created, error: insErr } = await sb
    .from('conversations')
    .insert(insertPayload)
    .select('id')
    .returns<Pick<ConversationsRow, 'id'>[]>()
    .single();

  if (insErr || !created) {
    return NextResponse.json(
      { error: insErr?.message || 'Failed to create conversation' },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: created.id, reused: false });
}
