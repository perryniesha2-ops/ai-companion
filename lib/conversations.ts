// lib/conversations.ts
import { supabaseServer } from '@/lib/supabase-server';
import type { Database } from '@/types';

type ConvRow = Database['public']['Tables']['conversations']['Row'];

export async function getOrCreateLatestConversation() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { redirectToLogin: true } as const;

  // Find latest
  const { data: latest } = await sb
    .from('conversations')
    .select('id')
    .eq('user_id', user.id)
    .eq('archived', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .returns<Pick<ConvRow,'id'>[]>();

  if (latest && latest[0]) return { conversationId: latest[0].id } as const;

  // Create first conversation
  const { data: created, error } = await sb
    .from('conversations')
    .insert({ title: 'Chat' })
    .select('id')
    .returns<Pick<ConvRow,'id'>[]>();

  if (error || !created?.[0]) return { error: error?.message || 'Failed to create conversation' } as const;

  return { conversationId: created[0].id } as const;
}
