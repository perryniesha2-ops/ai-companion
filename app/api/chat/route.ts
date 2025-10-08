// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { openai } from '@/lib/openai';
import type { Database } from '@/types';

const FREE_DAILY = 30;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type ProfilePremiumRow = Pick<Database['public']['Tables']['profiles']['Row'], 'is_premium'>;
type UsageCountRow    = Pick<Database['public']['Tables']['daily_usage']['Row'], 'count'>;
type MemRow           = Pick<Database['public']['Tables']['memories']['Row'], 'content'>;
type CompanionRow     = Pick<Database['public']['Tables']['companions']['Row'], 'system_prompt' | 'name'>;

export async function POST(req: NextRequest) {
  try {
    const sb = supabaseServer();
    const { data: { session }, error: sessErr } = await sb.auth.getSession();
    if (sessErr || !session) return bad('Unauthorized', 401);
    const userId = session.user.id;

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const conversationId =
      typeof body.conversation_id === 'string' && body.conversation_id
        ? body.conversation_id
        : null;

    if (!message) return bad('Message required');

    // 1) Premium + usage check
    const [{ data: profile, error: profErr }, { data: usageRow, error: usageErr }] = await Promise.all([
      sb.from('profiles')
        .select('is_premium')
        .eq('id', userId)
        .returns<ProfilePremiumRow[]>()
        .single(),
      sb.from('daily_usage')
        .select('count')
        .eq('user_id', userId)
        .eq('day', todayStr())
        .returns<UsageCountRow[]>()
        .maybeSingle(),
    ]);
    if (profErr) return bad(profErr.message, 500);
    if (usageErr && usageErr.code !== 'PGRST116') return bad(usageErr.message, 500);

    if (!profile?.is_premium) {
      const used = usageRow?.count ?? 0;
      if (used >= FREE_DAILY) return bad('Daily free limit reached. Upgrade to continue.', 402);
    }

    // 2) Companion (filter by user!)
    const { data: companion, error: compErr } = await sb
      .from('companions')
      .select('system_prompt, name')
      .eq('user_id', userId)
      .returns<CompanionRow[]>()
      .maybeSingle();
    if (compErr && compErr.code !== 'PGRST116') return bad(compErr.message, 500);

    const systemPrompt =
      companion?.system_prompt ??
      `You are a warm, supportive companion. Keep replies to 2–4 sentences.`;

    // 3) Memories summary (optional)
    const { data: mems } = await sb
      .from('memories')
      .select('content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<MemRow[]>();
    const memoryBlurb = (mems ?? []).map((m) => `• ${m.content}`).join('\n');
    const memoryLine = memoryBlurb ? `\nThese user facts may help:\n${memoryBlurb}` : '';

    // 4) Short history (optional). If you want per-conversation context, keep the filter.
    let msgQ = sb
      .from('messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12);
    if (conversationId) msgQ = msgQ.eq('conversation_id', conversationId);
    const { data: recent } = await msgQ;
    const history = (recent ?? []).reverse()
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    // 5) OpenAI – use Responses API with a single `input` string
    const prompt =
      `${systemPrompt}${memoryLine}\n\n` +
      (history ? `Recent messages:\n${history}\n\n` : '') +
      `User: ${message}\nAssistant:`;

    let text = '…';
    try {
      const r = await openai.responses.create({
        model: 'gpt-4o-mini',
        input: prompt,
        temperature: 0.7,
      });
      text = (r.output_text ?? '…').trim();
    } catch (apiErr) {
      console.error('OpenAI error:', apiErr);
      return bad('AI is momentarily unavailable. Please try again.', 502);
    }

    // 6) Save messages + increment usage via PostgREST (raw fetch avoids TS generic pain)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const token = session.access_token;

    // a) Save messages (user + assistant)
    {
      const payload = [
        {
          user_id: userId,
          role: 'user',
          content: message,
          conversation_id: conversationId, // null is ok
        },
        {
          user_id: userId,
          role: 'assistant',
          content: text,
          conversation_id: conversationId,
        },
      ];
      const res = await fetch(`${url}/rest/v1/messages`, {
        method: 'POST',
        headers: {
          apikey: anon,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('Save messages failed:', j);
        return bad('Failed to save messages', 500);
      }
    }

    // b) Increment daily_usage (requires unique constraint on (user_id, day))
    {
      const day = todayStr();
      // try single-request upsert (merge duplicates)
      const res = await fetch(`${url}/rest/v1/daily_usage`, {
        method: 'POST',
        headers: {
          apikey: anon,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ user_id: userId, day, count: (usageRow?.count ?? 0) + 1 }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.warn('daily_usage upsert failed, falling back to PATCH:', j);
        await fetch(`${url}/rest/v1/daily_usage?user_id=eq.${userId}&day=eq.${day}`, {
          method: 'PATCH',
          headers: {
            apikey: anon,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ count: (usageRow?.count ?? 0) + 1 }),
        });
      }
    }

    // c) Quick memory extraction (best-effort)
    try {
      const mem = await openai.responses.create({
        model: 'gpt-4o-mini',
        input:
          `Extract an enduring personal fact from this user message in one short sentence, ` +
          `or reply "none". Message: ${message}`,
        temperature: 0.2,
      });
      const extracted = (mem.output_text || '').trim();
      if (extracted && extracted.toLowerCase() !== 'none') {
        await fetch(`${url}/rest/v1/memories`, {
          method: 'POST',
          headers: {
            apikey: anon,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            user_id: userId,
            content: extracted,
            importance: 3,
            conversation_id: conversationId, // keep the thread context if you added this column
          }),
        });
      }
    } catch (e) {
      console.warn('memory extraction skipped:', e);
    }

    return NextResponse.json({ text });
  } catch (e) {
    console.error('/api/chat fatal:', e);
    return bad('Unexpected server error', 500);
  }
}
