// app/api/onboarding/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { postgrestRpc } from '@/lib/rest';

import type { Tone, Expertise } from '@/types';

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getAccessToken(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { session } } = await sb.auth.getSession();
  if (session?.access_token) return session.access_token;
  const hdr = req.headers.get('authorization');
  if (hdr?.startsWith('Bearer ')) return hdr.slice(7);
  return null;
}

// Ensure profile row exists
export async function PUT(req: NextRequest) {
  const token = await getAccessToken(req);
  if (!token) return bad('Unauthorized', 401);
  await postgrestRpc('ensure_profile', {}, token);
  return NextResponse.json({ ok: true });
}

// Save onboarding + create/update companion
export async function POST(req: NextRequest) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return bad('Unauthorized', 401);

  const token = await getAccessToken(req);
  if (!token) return bad('Unauthorized', 401);

  const { nickname, tone, expertise, goal } = (await req.json()) as {
    nickname: string; tone: Tone; expertise: Expertise; goal: string;
  };
  if (!nickname?.trim()) return bad('Nickname is required');
  if (!goal?.trim()) return bad('Goal is required');

  // mark onboarding complete (RPC)
  await postgrestRpc('set_onboarding', {
    p_nickname: nickname ?? null,
    p_tone: tone ?? null,
    p_expertise: expertise ?? null,
    p_goal: goal ?? null,
  }, token);

 
  // First try insert; if exists, PATCH
  const insertRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/companions`, {
    method: 'POST',
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      user_id: user.id,
      name: nickname.trim(),
      tone,
      expertise,
      goal,
    
    }),
  });

  if (!insertRes.ok) {
    // likely conflict → patch existing
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/companions?user_id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ name: nickname.trim(), tone, expertise, goal}),
    });
  }

  return NextResponse.json({ ok: true });
}
