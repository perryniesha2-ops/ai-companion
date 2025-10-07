'use client';

import { useState } from 'react';

export type BillingData = {
  used: number;
  freeDaily: number;
  isPremium: boolean;
  email?: string | null;
};

// Accept partial/optional data and fall back to safe defaults
export default function BillingPanel({ data }: { data?: Partial<BillingData> }) {
  const used = data?.used ?? 0;
  const freeDaily = data?.freeDaily ?? 40;
  const isPremium = !!data?.isPremium;
  const email = data?.email ?? null;

  const progress = Math.min(1, Math.max(0, used / Math.max(1, freeDaily)));
  const pct = Math.round(progress * 100);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function startCheckout() {
    try {
      setBusy(true); setErr(null);
      const res = await fetch('/api/billing/checkout', { method: 'POST' });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error || 'Checkout failed');
      window.location.href = j.url;
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    try {
      setBusy(true); setErr(null);
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error || 'Portal failed');
      window.location.href = j.url;
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="hstack" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="kpi-title" style={{ fontSize: 16 }}>Current Plan</div>
          <div className="small muted">{email || '—'}</div>
        </div>

        {isPremium ? (
          <button className="btn btn--outline" onClick={openPortal} disabled={busy}>
            Manage Subscription
          </button>
        ) : (
          <button className="btn-grad" onClick={startCheckout} disabled={busy}>
            {busy ? 'Loading…' : 'Start Premium At $9.99/mo'}
          </button>
        )}
      </div>

      {!isPremium && (
        <div className="panel-section">
          <div className="small muted">Today</div>
          <div
            aria-label="usage"
            style={{ height: 8, borderRadius: 999, background: '#eef2f7', overflow: 'hidden', marginTop: 8 }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--grad-from), var(--grad-to))',
                boxShadow: 'inset 0 0 1px rgba(0,0,0,.1)',
              }}
            />
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>
            {Math.min(used, freeDaily)} / {freeDaily} messages
          </div>
        </div>
      )}

      <div className="panel-section">
        <div className="kpi-title" style={{ fontSize: 16 }}>Unlock Premium Features</div>
        <div className="row-list" style={{ marginTop: 10 }}>
          <FeatureRow icon="🚀" title="Unlimited messages" />
          <FeatureRow icon="🧠" title="GPT-4 responses" />
          <FeatureRow icon="🎙️" title="Voice conversations" />
          <FeatureRow icon="⚡" title="Priority support" />
        </div>
      </div>

      {err && <p className="auth-error small" style={{ marginTop: 10 }}>{err}</p>}
    </section>
  );
}

function FeatureRow({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="row">
      <div className="ico" aria-hidden>{icon}</div>
      <div className="title">{title}</div>
      <div />
    </div>
  );
}
