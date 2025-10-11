import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { generateEmbedding } from '@/lib/embeddings';

export async function POST(req: NextRequest) {
  const sb = supabaseServer();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { query, limit = 12 } = await req.json().catch(() => ({ query: '' }));
  if (!query?.trim()) return NextResponse.json({ items: [] });

  const emb = await generateEmbedding(query);

  // Use RPC-less PostgREST filter with ordering by distance
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const token = session.access_token;

  // PostgREST doesn't support binding arrays to computed order directly,
  // so we call a small SQL function OR use the /rest/v1/rpc approach. Here’s an rpc pattern:

  // 1) Create this function once in SQL:
  // create or replace function match_memories(uid uuid, query vector, lim int)
  // returns table (id uuid, content text, kind text, category text, importance int, tags text[], created_at timestamptz, dist float)
  // language sql stable as $$
  //   select m.id, m.content, m.kind, m.category, m.importance, m.tags, m.created_at,
  //          (m.embedding <=> query) as dist
  //   from public.memories m
  //   where m.user_id = uid and m.embedding is not null
  //   order by m.embedding <=> query
  //   limit lim
  // $$;

  const res = await fetch(`${url}/rest/v1/rpc/match_memories`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid: session.user.id,
      query: emb,
      lim: Math.min(50, Math.max(1, Number(limit) || 12)),
    }),
  });

  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    return NextResponse.json({ error: 'search_failed', details: j }, { status: 500 });
  }

  const items = await res.json();
  // Optional: convert dist (smaller is better) to score
  const scored = items.map((it: any) => ({
    ...it,
    score: 1 - (it.dist ?? 0),
  }));
  return NextResponse.json({ items: scored });
}
