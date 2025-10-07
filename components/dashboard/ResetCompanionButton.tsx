'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetCompanionButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onReset() {
    const ok = window.confirm(
      'Reset companion? This will permanently delete your chats and memories.'
    );
    if (!ok) return;

    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/companion/reset', { method: 'DELETE' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Failed to reset');
      router.replace('/onboarding?next=%2Fdashboard');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hstack" style={{ gap: 10 }}>
      <button  className="btn-primary danger" onClick={onReset} disabled={busy}>
        {busy ? 'Resetting…' : 'Reset Companion'}
      </button>
      {err && <span className="auth-error small">{err}</span>}
    </div>
  );
}
