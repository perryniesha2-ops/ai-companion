// app/api/companion/ensure/route.ts
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import type { Database } from '@/types';

type Insert    = Database['public']['Tables']['companions']['Insert'];
type Row       = Database['public']['Tables']['companions']['Row'];
type Tone      = Row['tone'];
type Expertise = Row['expertise'];

const TONES: readonly Tone[]       = ['friendly','professional','funny','supportive'] as const;
const EXPERTS: readonly Expertise[] = ['generalist','coach','researcher','therapist'] as const;

function isTone(v: unknown): v is Tone {
  return typeof v === 'string' && (TONES as readonly string[]).includes(v);
}
function isExpertise(v: unknown): v is Expertise {
  return typeof v === 'string' && (EXPERTS as readonly string[]).includes(v);
}
function buildPrompt(name: string, tone: Tone, expertise: Expertise, goal: string | null) {
  return [
    `You are ${name}, an AI companion.`,
    `Tone: ${tone}. Role: ${expertise}.`,
    goal ? `Primary goal: ${goal}.` : null,
    `Keep replies warm, supportive, and 2–4 sentences.`,
  ].filter(Boolean).join(' ');
}

type Body = Partial<Pick<Row, 'name' | 'tone' | 'expertise' | 'goal'>>;

export async function POST(req: Request) {
  const sb = supabaseServer(); // if your supabaseServer is async, do: const sb = await supabaseServer();
  const { data: { user }, error: uErr } = await sb.auth.getUser();
  if (uErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Body is optional; tolerate bad JSON
  let body: Body = {};
  try {
    body = await req.json() as Body;
  } catch {
    // ignore — we’ll fallback to defaults/existing
  }

  // Pull existing to merge
  const { data: existing, error: exErr } = await sb
    .from('companions')
    .select('*')
    .eq('user_id', user.id)
    .returns<Row[]>()      // TS: inform array element type
    .maybeSingle();

  if (exErr && exErr.code !== 'PGRST116') {
    return NextResponse.json({ error: exErr.message }, { status: 500 });
  }

  // Resolve fields with strict defaults
  const name      = (body.name ?? existing?.name ?? 'Companion').toString().trim() || 'Companion';
  const tone      = isTone(body.tone ?? existing?.tone) ? (body.tone ?? existing?.tone)! : 'friendly';
  const expertise = isExpertise(body.expertise ?? existing?.expertise) ? (body.expertise ?? existing?.expertise)! : 'generalist';
  const goal      = typeof body.goal === 'string' ? body.goal : (existing?.goal ?? null);

  const payload: Insert = {
    user_id: user.id,
    name,
    tone,
    expertise,
    goal,
    system_prompt: buildPrompt(name, tone, expertise, goal),
  };

  // Upsert by unique user_id
  const { error: upErr } = await sb
    .from('companions')
    .upsert([payload], { onConflict: 'user_id' })
    .select('user_id')
    .single();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
