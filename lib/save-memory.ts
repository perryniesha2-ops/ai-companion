// lib/save-memory.ts
import { supabaseServer } from './supabase-server';
import { generateEmbedding } from './embeddings';
import type { ExtractedMemory } from './memory-extraction';

export async function saveExtractedMemories(opts: {
  userId: string;
  memories: ExtractedMemory[];
  conversationId?: string | null;
  companionId?: string | null;
}) {
  const { userId, memories, conversationId = null, companionId = null } = opts;
  if (!memories.length) return;

  const sb = supabaseServer();

  // Compute embeddings in series (safe) or Promise.all (faster) – start with series
  for (const m of memories) {
    const embedding = await generateEmbedding(m.content).catch(() => null);
    const payload = {
      user_id: userId,
      conversation_id: conversationId,
      companion_id: companionId,
      content: m.content,
      kind: m.type,
      category: m.category ?? null,
      importance: Math.min(5, Math.max(1, m.importance ?? 3)),
      tags: m.tags?.slice(0, 5) ?? [],
      embedding, // pgvector will accept float[]; PostgREST maps to vector
    };

    // Best-effort insert; don’t let errors fail the request
    const { error } = await sb.from('memories').insert(payload);
    if (error) console.warn('insert memory failed:', error.message);
  }
}
