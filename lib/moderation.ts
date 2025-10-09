// lib/moderation.ts
import { openai } from '@/lib/openai';

/** Reasons we may block or safe-complete */
export type SafetyReason =
  | 'self_harm'
  | 'sexual_minor'
  | 'sexual_explicit'
  | 'violence'
  | 'other';

export type SafetyGateOk = { ok: true; categories: string[] };
export type SafetyGateBlock = { ok: false; reason: SafetyReason; categories: string[] };
export type SafetyGate = SafetyGateOk | SafetyGateBlock;

export function selfHarmSafeReply(): string {
  return [
    "I'm really sorry you're feeling this way. I can't help with anything that could harm you,",
    'but you’re not alone and you deserve support. If you’re in immediate danger, please call your local emergency number.',
    '',
    'US: call or text 988 (Suicide & Crisis Lifeline).',
    'UK & ROI: Samaritans at 116 123.',
    'Canada: call or text 988.',
    'Find local resources: https://findahelpline.com',
    '',
    'If you want, we can talk about what’s been hardest today and think of one small step to feel a bit safer.'
  ].join(' ');
}

/**
 * Convert the OpenAI moderation categories object to a plain
 * Record<string, boolean> without unsafe casts.
 */
function normalizeCategories(cats: unknown): Record<string, boolean> {
  if (cats && typeof cats === 'object') {
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(cats as Record<string, unknown>)) {
      out[k] = Boolean(v);
    }
    return out;
  }
  return {};
}

function mapCategory(rec: Record<string, boolean>): SafetyReason | null {
  if (rec['self-harm'] || rec['self-harm/intent'] || rec['self-harm/instructions']) return 'self_harm';
  if (rec['sexual/minors']) return 'sexual_minor';
  if (rec['sexual/explicit']) return 'sexual_explicit';
  if (rec['violence/graphic'] || rec['violence/threats'] || rec['violence']) return 'violence';
  return null;
}

/** Run OpenAI moderation on text; return allow/block + reason */
export async function gateText(text: string): Promise<SafetyGate> {
  const r = await openai.moderations.create({
    model: 'omni-moderation-latest',
    input: text,
  });

  const result = r.results?.[0];
  const categoriesRec = normalizeCategories(result?.categories);
  const categories = Object.keys(categoriesRec).filter((k) => categoriesRec[k]);

  const reason = mapCategory(categoriesRec);
  if (!result?.flagged || !reason) return { ok: true, categories };
  return { ok: false, reason, categories };
}
