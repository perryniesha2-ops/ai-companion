// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { openai } from '@/lib/openai';
import type { Database } from '@/types';
import { extractMemoriesFromMessage } from '@/lib/memory-extraction';
import { generateEmbedding } from '@/lib/embeddings';

const FREE_DAILY = 30;
const DEV = process.env.NODE_ENV !== 'production';
const SKIP_MOD = process.env.SKIP_MODERATION === 'true';

const bad = (message: string, status = 400, extra?: Record<string, unknown>) =>
  NextResponse.json({ error: message, ...(DEV ? extra : {}) }, { status });

const todayStr = () => new Date().toISOString().slice(0, 10);
const isUuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

// Narrow types
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
    'If you want, we can talk about what’s been hardest today and think of one small step to feel a bit safer.',
  ].join(' ');
}

// Minimal, resilient moderation
async function moderate(
  text: string
): Promise<{ ok: true } | { ok: false; kind: 'self_harm' | 'blocked' }> {
  if (SKIP_MOD) return { ok: true };
  try {
    const r = await openai.moderations.create({
      model: 'omni-moderation-latest',
      input: text,
    });
    const result = (r as any)?.results?.[0];
    const categories = ((result?.categories ?? {}) || {}) as Record<string, boolean>;
    const flagged = !!result?.flagged;

    if (!flagged) return { ok: true };
    if (categories['self-harm'] || categories['self-harm/intent'] || categories['self-harm/instructions']) {
      return { ok: false, kind: 'self_harm' };
    }
    return { ok: false, kind: 'blocked' };
  } catch {
    // Fail-open to avoid user friction on transient errors
    return { ok: true };
  }
}

export async function POST(req: NextRequest) {
  try {
    // ---- Auth ----
    const sb = supabaseServer();
    const { data: { session }, error: sessErr } = await sb.auth.getSession();
    if (sessErr || !session) return bad('Unauthorized', 401);
    const userId = session.user.id;

    // ---- Parse body ----
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const conversationId = isUuid(body.conversation_id) ? (body.conversation_id as string) : null;
    if (!message) return bad('Message required');

    // ---- Input moderation ----
    const gateIn = await moderate(message);
    if (!gateIn.ok) {
      if (gateIn.kind === 'self_harm') {
        return NextResponse.json({ text: selfHarmSafeReply(), safe: true });
      }
      return bad('Sorry — I can’t help with that request.', 403);
    }

    // ---- Premium + usage ----
    const [{ data: profile, error: profErr }, { data: usageRow, error: usageErr }] = await Promise.all([
      sb.from('profiles').select('is_premium').eq('id', userId).returns<ProfilePremiumRow[]>().single(),
      sb.from('daily_usage').select('count').eq('user_id', userId).eq('day', todayStr()).returns<UsageCountRow[]>().maybeSingle(),
    ]);
    if (profErr) return bad(profErr.message, 500);
    if (usageErr && usageErr.code !== 'PGRST116') return bad(usageErr.message, 500);

    const usedSoFar = usageRow?.count ?? 0;
    if (!profile?.is_premium && usedSoFar >= FREE_DAILY) {
      return bad('Daily free limit reached. Upgrade to continue.', 402);
    }

    // ---- Companion prompt (scoped to user) ----
    const { data: companion, error: compErr } = await sb
      .from('companions')
      .select('system_prompt, name')
      .eq('user_id', userId)
      .returns<CompanionRow[]>()
      .maybeSingle();
    if (compErr && compErr.code !== 'PGRST116') return bad(compErr.message, 500);

    const systemPrompt =
      companion?.system_prompt ??
      'You are a warm, supportive companion. Keep replies to 2–4 sentences.';

    // ---- Retrieve relevant memories (vector RPC with fallback) ----
    let memoryLine = '';
    try {
      // Embed current message and fetch closest memories
      const queryEmbedding = await generateEmbedding(message);
      const { data: matched, error: rpcErr } = await sb.rpc('match_memories', {
        p_user_id: userId,
        p_query_embedding: queryEmbedding as unknown as number[], // supabase-js serializes fine
        p_match_count: 8,
      });

      if (!rpcErr && matched && matched.length > 0) {
        const memoryBlurb = matched.map((m: any) => `• ${m.content}`).join('\n');
        memoryLine = memoryBlurb ? `\nThese user facts may help:\n${memoryBlurb}` : '';
      } else {
        // Fallback: last 5 text memories
        const { data: mems } = await sb
          .from('memories')
          .select('content')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)
          .returns<MemRow[]>();
        const memoryBlurb = (mems ?? []).map((m) => `• ${m.content}`).join('\n');
        memoryLine = memoryBlurb ? `\nThese user facts may help:\n${memoryBlurb}` : '';
      }
    } catch (e) {
      // Silent on memory retrieval errors
      console.warn('memory retrieval skipped:', e);
    }

    // ---- Short chat history (per conversation if provided) ----
    let q = sb
      .from('messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12); // NOTE: do NOT put .returns here before the conditional
    if (conversationId) q = q.eq('conversation_id', conversationId);
    const { data: recent } = await q;

    const history = (recent ?? [])
      .reverse()
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    // ---- Generate reply ----
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

    // ---- Output moderation ----
    const gateOut = await moderate(text);
    if (!gateOut.ok) {
      if (gateOut.kind === 'self_harm') {
        return NextResponse.json({ text: selfHarmSafeReply(), safe: true });
      }
      return bad('Sorry — I can’t share that.', 403);
    }

    // ---- Persist via REST ----
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const token = session.access_token;

    // a) Save messages (user + assistant)
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

    // b) Increment daily_usage
    const nextCount = usedSoFar + 1;
    {
      const day = todayStr();
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

    // c) Memory extraction + embeddings (best-effort)
    try {
      const recentContext = (recent ?? []).slice(-6).map(m => `${m.role}: ${m.content}`);
      const extracted = await extractMemoriesFromMessage(message, recentContext);

      if (Array.isArray(extracted) && extracted.length > 0) {
        const rowsFull = await Promise.all(
          extracted.slice(0, 5).map(async (m) => {
            const base: Record<string, unknown> = {
              user_id: userId,
              content: m.content,
              importance: Math.min(5, Math.max(1, Math.round((m as any).importance ?? 3))),
              kind: (m as any).type ?? null,                 // requires 'kind' column
              category: (m as any).category ?? null,         // requires 'category' column
              tags: Array.isArray((m as any).tags) ? (m as any).tags.slice(0, 8) : [], // requires 'tags'
            };
            if (conversationId) base.conversation_id = conversationId;

            try {
              const vec = await generateEmbedding(m.content);
              base.embedding = vec;                           // requires 'embedding vector' column
            } catch {
              // leave out embedding if embedding service fails
            }
            return base;
          })
        );

        // Try insert with all columns
        let res = await fetch(`${url}/rest/v1/memories`, {
          method: 'POST',
          headers: {
            apikey: anon,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(rowsFull),
        });

        if (!res.ok) {
          // Fallback: minimal columns guaranteed to exist
          const minimal = rowsFull.map(r => ({
            user_id: r.user_id,
            content: r.content,
            importance: r.importance,
            ...(conversationId ? { conversation_id: conversationId } : {}),
          }));
          await fetch(`${url}/rest/v1/memories`, {
            method: 'POST',
            headers: {
              apikey: anon,
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(minimal),
          }).catch(() => {});
        }
      }
    } catch {
      // ignore extraction/embedding errors
    }

    // ---- Done ----
    const left = Math.max(0, FREE_DAILY - nextCount);
    return NextResponse.json({ text, left });
  } catch (e) {
    return bad('Unexpected server error', 500);
  }
}
