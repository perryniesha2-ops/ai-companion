// lib/memory-search.ts
import { supabaseServer } from './supabase-server';
import { generateEmbedding } from './embeddings';

export async function searchMemories(userId: string, query: string, k = 5) {
  const sb = supabaseServer();
  const qEmbed = await generateEmbedding(query);

  // Requires pgvector and idx_memories_embedding_hnsw
  const { data, error } = await sb
    .rpc('match_memories', {
      p_user_id: userId,
      p_query_embedding: qEmbed,
      p_match_count: k,
    });

  if (error) {
    console.error('match_memories rpc failed:', error.message);
    return [];
  }
  return data ?? [];
}
