// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { postgrestInsert } from '@/lib/rest';
import { openai } from '@/lib/openai';
import type { Database, Tables } from '@/types';

const FREE_DAILY = 30;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Narrow row types for selects (prevents TS `never` issues)
type ProfilePremiumRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'is_premium'
>;
type UsageCountRow = Pick<
  Database['public']['Tables']['daily_usage']['Row'],
  'count'
>;
type MemRow = Pick<
  Database['public']['Tables']['memories']['Row'],
  'content'
>;
type MsgRow = Pick<
  Database['public']['Tables']['messages']['Row'],
  'role' | 'content' | 'created_at'
>;
type CompanionRow = {
  system_prompt: string;
  name: string;
};

export async function POST(req: NextRequest) {
  const sb = supabaseServer();

  // Body accepts optional conversation_id to resume a thread
  const body = (await req.json()) as { message: string; conversation_id?: string };
  const message = (body.message ?? '').trim();
  const conversationId = body.conversation_id ?? null;
  if (!message) return bad('Message required');

  // Auth
  const {
    data: { session },
    error: sessErr,
  } = await sb.auth.getSession();
  if (sessErr || !session) return bad('Unauthorized', 401);
  const userId = session.user.id;

  // If a conversation_id is supplied, ensure it belongs to the user
  if (conversationId) {
    const { data: conv, error: convErr } = await sb
      .from('conversations')
      .select('id, user_id, archived')
      .eq('id', conversationId)
      .maybeSingle();

    if (convErr) return bad(convErr.message, 500);
    if (!conv || conv.user_id !== userId || conv.archived) {
      return bad('Conversation not found or not accessible.', 403);
    }
  }

  // Premium & usage
  const { data: profile, error: profErr } = await sb
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .returns<ProfilePremiumRow[]>() // explicit row type (array before .single/.maybeSingle)
    .single();

  if (profErr) return bad(profErr.message, 500);

  const { data: usageRow, error: usageErr } = await sb
    .from('daily_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('day', todayStr())
    .returns<UsageCountRow[]>() // explicit row type
    .maybeSingle();

  if (usageErr && usageErr.code !== 'PGRST116') {
    // ignore "row not found" errors (PostgREST code for no results)
    return bad(usageErr.message, 500);
  }

  if (!profile?.is_premium) {
    const used = usageRow?.count ?? 0;
    if (used >= FREE_DAILY) {
      return bad('Daily free limit reached. Upgrade to continue.', 402);
    }
  }

  // Companion prompt (optional per-user companion)
  const { data: companion } = await sb
    .from('companions')
    .select('system_prompt, name')
    .eq('user_id', userId) // scope to user if your schema has user_id
    .returns<CompanionRow[]>()
    .maybeSingle();

  const baseSystem =
    companion?.system_prompt ??
    'You are a warm, supportive companion. Keep replies to 2–4 sentences. Be empathetic.';

  // Short memory context
  const { data: mems } = await sb
    .from('memories')
    .select('content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)
    .returns<MemRow[]>();

  const memoryBlurb = (mems ?? []).map((m) => `• ${m.content}`).join('\n');
  const memoryLine = memoryBlurb ? `\nThese user facts may help:\n${memoryBlurb}` : '';

  // Recent history for the conversation (or user-wide if no cid)
  const msgQuery = sb
    .from('messages')
    .select('role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(12);

  const { data: recent } = conversationId
    ? await msgQuery.eq('conversation_id', conversationId).returns<MsgRow[]>()
    : await msgQuery.returns<MsgRow[]>();

  const history = (recent ?? []).reverse();

  // --- Generate with OpenAI Responses API ---
  const sysContent = baseSystem + memoryLine;
  const input = [
    { role: 'system' as const, content: sysContent },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ];

  const completion = await openai.responses.create({
    model: 'gpt-4o-mini',
    input,
  });

  const text = completion.output_text?.trim() || '…';

  // --- Persist: messages, usage, conversation updated_at ---
  try {
    // Save user + assistant messages (with conversation_id if provided)
    await postgrestInsert(
      'messages',
      [
        { user_id: userId, role: 'user', content: message, conversation_id: conversationId },
        { user_id: userId, role: 'assistant', content: text, conversation_id: conversationId },
      ],
      session.access_token
    );

    // Bump conversation updated_at if we’re in a thread
    if (conversationId) {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/conversations?id=eq.${conversationId}`,
        {
          method: 'PATCH',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ updated_at: new Date().toISOString() }),
        }
      );
    }

    // Increment daily usage (insert if not exists, else patch)
    const day = todayStr();
    try {
      await postgrestInsert(
        'daily_usage',
        { user_id: userId, day, count: 1 },
        session.access_token
      );
    } catch {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/daily_usage?user_id=eq.${userId}&day=eq.${day}`,
        {
          method: 'PATCH',
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ count: (usageRow?.count ?? 0) + 1 }),
        }
      );
    }

    // Lightweight memory extraction (optional)
    const memoryResp = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content:
            'Extract any enduring personal fact from the user message in one concise sentence, or reply "none".',
        },
        { role: 'user', content: message },
      ],
      temperature: 0.2,
    });

    const extracted = memoryResp.output_text?.trim() ?? 'none';
    if (extracted.toLowerCase() !== 'none') {
      await postgrestInsert(
        'memories',
        {
          user_id: userId,
          content: extracted,
          importance: 3,
          // optionally associate with conversation:
          conversation_id: conversationId ?? null,
        } as Partial<Tables<'memories'>>, // keep REST helper happy
        session.access_token
      );
    }
  } catch (e) {
    return bad((e as Error).message || 'Failed to save', 500);
  }

  return NextResponse.json({ text });
}
