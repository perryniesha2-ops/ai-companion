// lib/memory-extraction.ts
import { openai } from './openai';

export type ExtractedMemory = {
  content: string;
  type: 'semantic' | 'episodic';
  category: string;
  importance: number;
  tags: string[];
};

const MAX_CONTENT_LEN = 500;
const MAX_TAGS = 5;

export function categorizeMemory(content: string): string {
  const text = content.toLowerCase();
  const table: Record<string, string[]> = {
    personal: ['name','age','birthday','live','from','family'],
    work: ['job','work','career','company','boss','manager','project'],
    relationships: ['partner','spouse','dating','friend','relationship'],
    hobbies: ['hobby','like','enjoy','play','watch','read','music','game','sport'],
    health: ['health','exercise','fitness','diet','sleep','medical'],
    goals: ['goal','plan','want to','learning','working on','aspire'],
  };
  for (const [cat, ks] of Object.entries(table)) if (ks.some(k => text.includes(k))) return cat;
  return 'general';
}

function normalizeMemory(m: Partial<ExtractedMemory>): ExtractedMemory | null {
  const content = String(m.content ?? '').trim().slice(0, MAX_CONTENT_LEN);
  if (!content) return null;
  const type: ExtractedMemory['type'] = m.type === 'episodic' ? 'episodic' : 'semantic';
  const importance = Math.min(5, Math.max(1, Math.round(Number(m.importance ?? 3))));
  const category = (m.category && String(m.category).trim()) || categorizeMemory(content);
  const tags = Array.from(
    new Set((Array.isArray(m.tags) ? m.tags : []).map(t => String(t).trim().toLowerCase()).filter(Boolean))
  ).slice(0, MAX_TAGS);
  return { content, type, category, importance, tags };
}

function normalizeMemories(items: unknown): ExtractedMemory[] {
  if (!Array.isArray(items)) return [];
  const out: ExtractedMemory[] = [];
  for (const item of items) {
    const n = normalizeMemory(item as Partial<ExtractedMemory>);
    if (n) out.push(n);
  }
  return out;
}

function safeJson(s: string): any {
  if (!s) return { memories: [] };
  try { return JSON.parse(s); } catch {}
  const cleaned = s.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/,'');
  try { return JSON.parse(cleaned); } catch { return { memories: [] }; }
}

export async function extractMemoriesFromMessage(
  message: string,
  conversationContext: string[]
): Promise<ExtractedMemory[]> {
  const userBlock = [
    'Extract durable user memories as JSON. STRICTLY return a JSON object like: {"memories":[{...}]}.',
    'Each memory: { "content": string, "type":"semantic"|"episodic", "category": string (optional), "importance": 1-5, "tags": string[] (<=5) }',
    `Message: """${message}"""`,
    conversationContext?.length ? `Recent context (optional):\n${conversationContext.join('\n')}` : '',
    'If nothing important, return {"memories":[]}. Do not include commentary.',
  ].filter(Boolean).join('\n\n');

  try {
    const r = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        { role: 'system', content: 'You output ONLY JSON as instructed. No prose.' },
        { role: 'user', content: userBlock },
      ],
      temperature: 0.2,
    });

    const raw = (r.output_text ?? '').trim();
    const parsed = safeJson(raw);
    return normalizeMemories(parsed.memories);
  } catch (e) {
    console.error('memory extraction failed:', e);
    return [];
  }
}
