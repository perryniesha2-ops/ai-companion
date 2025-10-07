'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignOutButton({ className = 'btn btn--outline' }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handle() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.replace('/auth/login');
  }

  return (
    <button className={className} onClick={handle} disabled={busy}>
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
