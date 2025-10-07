// components/MessageList.tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MessageRow } from '@/types';

type Props = {
  items: ReadonlyArray<MessageRow>;
  conversationId?: string | null;
  companionId?: string | null;
  showResume?: boolean;
  className?: string;
};

export default function MessageList({
  items,
  conversationId,
  companionId,
  showResume = true,
  className,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '')),
    [items]
  );

  async function resumeChat() {
    try {
      setBusy(true);
      setErr(null);

      if (conversationId) {
        router.push(`/chat/${conversationId}`);
        return;
      }

      const res = await fetch('/api/conversations/ensure', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ companion_id: companionId ?? null }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to start chat');
      router.push(`/chat/${j.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <div className="messages" style={{ padding: 0 }}>
        {sorted.length === 0 ? (
          <div className="empty">No messages yet.</div>
        ) : (
          sorted.map((m) => {
            const sideClass =
              m.role === 'user' ? 'bubble bubble--user' : 'bubble bubble--assistant';
            return (
              <div key={String(m.id)} className={sideClass}>
                <div className="bubble-body">{m.content}</div>
              </div>
            );
          })
        )}
      </div>

      {showResume && (
        <div className="hstack" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn--gradient" onClick={resumeChat} disabled={busy}>
            {busy ? 'Opening…' : 'Resume chat'}
          </button>
        </div>
      )}

      {err && (
        <p className="auth-error small" role="alert" style={{ marginTop: 8 }}>
          {err}
        </p>
      )}
    </div>
  );
}
