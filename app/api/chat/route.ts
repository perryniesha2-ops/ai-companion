import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { postgrestInsert } from '@/lib/rest';
import { openai } from '@/lib/openai';
import type { Database } from '@/types';


const FREE_DAILY = 30;

function bad(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
function todayStr() { const d = new Date(); return d.toISOString().slice(0,10); }


type ProfilePremiumRow = Pick<import('@/types').Database['public']['Tables']['profiles']['Row'], 'is_premium'>;
type UsageCountRow    = Pick<import('@/types').Database['public']['Tables']['daily_usage']['Row'], 'count'>;


export async function POST(req: NextRequest) {
 const sb = await supabaseServer();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return bad('Unauthorized', 401);
  const userId = session.user.id;

  const { message } = (await req.json()) as { message: string };
  if (!message?.trim()) return bad('Message required');


  

  // check premium + usage
  const { data: profile, error: profErr } = await sb
  .from('profiles')
  .select('is_premium')
  .eq('id', userId)
  .returns<ProfilePremiumRow[]>()   // <-- tell TS the shape (array before .single)
  .single();

if (profErr) return bad(profErr.message, 500);

const { data: usageRow, error: usageErr } = await sb
  .from('daily_usage')
  .select('count')
  .eq('user_id', userId)
  .eq('day', todayStr())
  .returns<UsageCountRow[]>()       // <-- tell TS the shape
  .maybeSingle();

if (usageErr && usageErr.code !== 'PGRST116') { // ignore “Row not found” if it happens
  return bad(usageErr.message, 500);
}

if (!profile?.is_premium) {
  const used = usageRow?.count ?? 0;
  if (used >= FREE_DAILY) return bad('Daily free limit reached. Upgrade to continue.', 402);
}

 // companion
type CompanionRow = { system_prompt: string; name: string };
 const { data: companion } = await sb
  .from('companions')
  .select('system_prompt, name')
  .returns<CompanionRow[]>()  
  .maybeSingle();

  const systemPrompt =
    companion?.system_prompt ??
    `You are a warm, supportive companion. Keep replies to 2–4 sentences.`;

// memories (optional short context)
  type MemRow = Pick<Database['public']['Tables']['memories']['Row'], 'content'>;
  const { data: mems } = await sb
    .from('memories')
    .select('content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)
    .returns<MemRow[]>();

  const memoryBlurb = (mems ?? []).map(m => `• ${m.content}`).join('\n');
  const memoryLine = memoryBlurb ? `\nThese user facts may help:\n${memoryBlurb}` : '';





  // fetch recent history for context
  const { data: recent } = await sb
    .from('messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(12);

  const history = (recent ?? []).reverse();



  // generate
  const sys = `You are a warm, supportive companion. Keep replies to 2–4 sentences. Be empathetic.`;
  const r = await openai.responses.create({
    model: 'gpt-4o-mini',
   input: [
      { role: 'system', content: systemPrompt + memoryLine },
      // ...history...
      { role: 'user', content: message },
    ],
  });

  const text = r.output_text ?? '…';

  // save messages + increment usage (via REST to avoid TS generics)
  try {
    await postgrestInsert('messages', [
      { user_id: userId, role: 'user', content: message },
      { user_id: userId, role: 'assistant', content: text }
    ], session.access_token);

    // increment daily usage
    const day = todayStr();
    // Upsert via PostgREST: if none, insert 1; else patch count = count+1
    // (two requests; simple + reliable)
    try {
      await postgrestInsert('daily_usage', { user_id: userId, day, count: 1 }, session.access_token);
    } catch {
      // already exists, bump via RPC-less PATCH
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/daily_usage?user_id=eq.${userId}&day=eq.${day}`, {
        method: 'PATCH',
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ count: (usageRow?.count ?? 0) + 1 })
      });
    }

    // extract memory (cheap heuristic)
    const mem = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        { role: 'system', content: 'Extract any enduring personal fact from the user message in one concise sentence, or reply "none".' },
        { role: 'user', content: message }
      ],
      temperature: 0.2,
    });
    const memory = (mem.output_text || 'none').trim().toLowerCase() !== 'none' ? mem.output_text : null;
    if (memory) {
      await postgrestInsert('memories', { user_id: userId, content: memory, importance: 3 }, session.access_token);
    }
  } catch (e) {
    return bad((e as Error).message || 'Failed to save', 500);
  }

  return NextResponse.json({ text });
}
