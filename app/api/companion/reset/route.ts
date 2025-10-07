import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE() {
  const sb = await supabaseServer();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return bad('Unauthorized', 401);
  const userId = session.user.id;

  // Delete in dependency-safe order (messages -> conversations -> memories -> companion)
  // If you’ve set ON DELETE CASCADE this will be faster, but this works universally.
  const steps = [
    sb.from('messages').delete().eq('user_id', userId),
    sb.from('conversations').delete().eq('user_id', userId),
    sb.from('memories').delete().eq('user_id', userId),
    sb.from('companions').delete().eq('user_id', userId),
    sb.from('profiles').update({ onboarding_complete: false }).eq('id', userId),
  ];

  for (const p of steps) {
    const { error } = await p;
    if (error) return bad(error.message, 500);
  }

  return NextResponse.json({ ok: true });
}
