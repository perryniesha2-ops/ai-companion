// scripts/backfill-embeddings.ts
import path from 'node:path';
import 'dotenv/config';

const raw = process.env.OPENAI_API_KEY ?? '';
const apiKey = raw.trim(); // strip hidden whitespace

console.log('[env] has key?', !!apiKey, 'len:', apiKey.length);
console.log('[env] preview:', apiKey.slice(0, 4), '…', apiKey.slice(-4));

if (!apiKey.startsWith('sk-')) {
  throw new Error('OPENAI_API_KEY not set or malformed. Check .env.local');
}



import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// ---- Required envs ----
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE; // recommended for scripts
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

// ---- Clients ----
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai   = new OpenAI({ apiKey: OPENAI_API_KEY });

// ...rest of your script




// Tune these
const BATCH_SIZE = 100;
const MODEL = 'text-embedding-3-small'; // 1536 dims (confirm model dims if you change)

async function fetchUnembeddedBatch() {
  // Grab a page of memories missing embeddings
  const { data, error } = await supabase
    .from('memories')
    .select('id, content')
    .is('embedding', null)
    .limit(BATCH_SIZE);

  if (error) throw error;
  return data ?? [];
}

async function updateEmbeddings(rows: { id: string; content: string }[]) {
  if (rows.length === 0) return;

  const inputs = rows.map((r) => r.content || '');

  const r = await openai.embeddings.create({
    model: MODEL,
    input: inputs,
  });

  const updates = rows.map((row, i) => ({
    id: row.id,
    embedding: r.data[i].embedding,
  }));

  // Upsert/Patch in chunks to avoid payload limits
  const { error } = await supabase
    .from('memories')
    .upsert(updates, { onConflict: 'id' });

  if (error) throw error;
}

async function main() {
  let total = 0;
  for (;;) {
    const batch = await fetchUnembeddedBatch();
    if (batch.length === 0) break;
    await updateEmbeddings(batch);
    total += batch.length;
    console.log(`Updated ${total} memories…`);
  }
  console.log(`Done. Total updated: ${total}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
