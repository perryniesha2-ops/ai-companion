// lib/embeddings.ts
import { openai } from './openai';

/** Returns a float[] of length 1536 (text-embedding-3-small). */
export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  const vec = res.data?.[0]?.embedding;
  if (!vec) throw new Error('No embedding returned');
  return vec;
}
