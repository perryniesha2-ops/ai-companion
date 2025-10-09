// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { openai } from '@/lib/openai';
import type { Database } from '@/types';

const FREE_DAILY = 30;
const DEV = process.env.NODE_ENV !== 'production';
const SKIP_MOD = process.env.SKIP_MODERATION === 'true';

const bad = (message: string, status = 400, extra?: Record<string, unknown>) =>
  NextResponse.json({ error: message, ...(DEV ? extra : {}) }, { status });

const todayStr = () => new Date().toISOString().slice(0, 10);
const isUuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

// Narrow types (match your working copy style)
type ProfilePremiumRow = Pick<Database['public']['Tables']['profiles']['Row'], 'is_premium'>;
type UsageCountRow    = Pick<Database['public']['Tables']['daily_usage']['Row'], 'count'>;
type MemRow           = Pick<Database['public']['Tables']['memories']['Row'], 'content'>;
type CompanionRow     = Pick<Database['public']['Tables']['companions']['Row'], 'system_prompt' | 'name'>;

function selfHarmSafeReply(): string {
  return [
    "I'm really sorry you're feeling this way. I can't help with anything that could harm you,",
    'but you’re not alone and you deserve support. If you’re in immediate danger, please call your local emergency number.',
    'US: call or text 988. UK/ROI: Samaritans 116 123. Canada: call or text 988.',
    'Find local resources: https://findahelpline.com',
    'If you want, we can talk about what’s been hardest today and think of one small step to feel a bit safer.'
  ].join(' ');
}

async function moderate(text: string): Promise<{ ok: true } | { ok: false; kind: 'self_harm' | 'blocked' }> {
  if (SKIP_MOD) return { ok: true };
  try {
    const r = await openai.moderations.create({
      model: 'omni-moderation-latest',
      input: text,
    });
    const res = (r as any)?.results?.[0];
    const cats = (res?.categories ?? {}) as Record<string, boolean>;
    const flagged = !!res?.flagged;

    if (!flagged) return { ok: true };

    if (cats['self-harm'] || cats['self-harm/intent'] || cats['self-harm/instructions']) {
      return { ok: false, kind: 'self_harm' };
    }
    return { ok: false, kind: 'blocked' };
  } catch {
    // If moderation API hiccups, fail open (you can flip this if you prefer)
    return { ok: true };
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auth
    const sb = supabaseServer();
    const { data: { session }, error: sessErr } = await sb.auth.getSession();
    if (sessErr || !session) return bad('Unauthorized', 401);
    const userId = session.user.id;

    // Parse body
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const conversationId = isUuid(body.conversation_id) ? (body.conversation_id as string) : null;
    if (!message) return bad('Message required');

    // Pre moderation
    const gateIn = await moderate(message);
    if (!gateIn.ok) {
      if (gateIn.kind === 'self_harm') {
        return NextResponse.json({ text: selfHarmSafeReply(), safe: true });
      }
      return bad('Sorry — I can’t help with that request.', 403);
    }

    // Premium + usage
    const [{ data: profile, error: profErr }, { data: usageRow, error: usageErr }] = await Promise.all([
      sb.from('profiles').select('is_premium').eq('id', userId).returns<ProfilePremiumRow[]>().single(),
      sb.from('daily_usage').select('count').eq('user_id', userId).eq('day', todayStr()).returns<UsageCountRow[]>().maybeSingle(),
    ]);
    if (profErr) return bad(profErr.message, 500);
    if (usageErr && usageErr.code !== 'PGRST116') return bad(usageErr.message, 500);

    if (!profile?.is_premium) {
      const used = usageRow?.count ?? 0;
      if (used >= FREE_DAILY) return bad('Daily free limit reached. Upgrade to continue.', 402);
    }

    // Companion (by user)
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

    // Memories
    const { data: mems } = await sb
      .from('memories')
      .select('content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<MemRow[]>();
    const memoryBlurb = (mems ?? []).map((m) => `• ${m.content}`).join('\n');
    const memoryLine = memoryBlurb ? `\nThese user facts may help:\n${memoryBlurb}` : '';

    // Short history (don’t add `.returns` on the builder you mutate)
    let msgQ = sb
      .from('messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12);
    if (conversationId) msgQ = msgQ.eq('conversation_id', conversationId);
    const { data: recent } = await msgQ;

    const history = (recent ?? [])
      .reverse()
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    // Generate
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
    } catch {
      return bad('AI is momentarily unavailable. Please try again.', 502);
    }

    // Post moderation
    const gateOut = await moderate(text);
    if (!gateOut.ok) {
      if (gateOut.kind === 'self_harm') {
        return NextResponse.json({ text: selfHarmSafeReply(), safe: true });
      }
      return bad('Sorry — I can’t share that.', 403);
    }

    // Persist via REST
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const token = session.access_token;

    // Save messages
    {
      const payload = [
        { user_id: userId, role: 'user',      content: message, conversation_id: conversationId },
        { user_id: userId, role: 'assistant', content: text,    conversation_id: conversationId },
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
        return bad('Failed to save messages', 500, { rest: j });
      }
    }

    // Increment usage
    {
      const day = todayStr();
      const nextCount = (usageRow?.count ?? 0) + 1;

      const up = await fetch(`${url}/rest/v1/daily_usage`, {
        method: 'POST',
        headers: {
          apikey: anon,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ user_id: userId, day, count: nextCount }),
      });
      if (!up.ok) {
        await fetch(`${url}/rest/v1/daily_usage?user_id=eq.${userId}&day=eq.${day}`, {
          method: 'PATCH',
          headers: {
            apikey: anon,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ count: nextCount }),
        });
      }
    }

    // Best-effort memory extraction (with fallback if your schema lacks conversation_id)
    try {
      const mem = await openai.responses.create({
        model: 'gpt-4o-mini',
        input: `Extract an enduring personal fact from this user message in one short sentence, or reply "none". Message: ${message}`,
        temperature: 0.2,
      });
      const extracted = (mem.output_text || '').trim();
      if (extracted && extracted.toLowerCase() !== 'none') {
        const tryWithConv = async () => {
          const payload: Record<string, unknown> = {
            user_id: userId,
            content: extracted,
            importance: 3,
          };
          if (conversationId) payload.conversation_id = conversationId;
          const res = await fetch(`${url}/rest/v1/memories`, {
            method: 'POST',
            headers: {
              apikey: anon,
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(payload),
          });
          return res;
        };

        let res = await tryWithConv();
        if (!res.ok) {
          // If the error is “column conversation_id not found”, try again without it
          res = await fetch(`${url}/rest/v1/memories`, {
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
            }),
          });
          // ignore result — best effort
        }
      }
    } catch {
      // ignore memory errors
    }

    return NextResponse.json({ text });
  } catch (e) {
    return bad('Unexpected server error', 500);
  }
}
