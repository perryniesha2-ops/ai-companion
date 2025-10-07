// components/CompanionStartButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CompanionStartButton({
  companionId,
  label = 'Open Chat',
}: {
  companionId?: string | null;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function openChat() {
    try {
      setBusy(true);
      setErr(null);
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="btn btn--gradient" onClick={openChat} disabled={busy}>
        {busy ? 'Opening…' : label}
      </button>
      {err && <p className="auth-error small" role="alert">{err}</p>}
    </div>
  );
}
