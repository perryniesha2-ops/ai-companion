// components/dashboard/BillingPanel.tsx
import Link from 'next/link';

export default function BillingPanel({
  isPremium,
  freeDaily,
  used,
}: {
  isPremium: boolean;
  freeDaily: number;
  used: number;
}) {
  return (
    <section className="panel">
      <div className="row" style={{ gridTemplateColumns: '1fr auto' }}>
        <div>
          <div className="title" style={{ fontWeight: 800, fontSize: 18 }}>
            Current Plan
          </div>
          <div className="muted small">{isPremium ? 'Premium' : 'Free'} — {freeDaily} messages per day</div>
        </div>
        <div>
          {isPremium ? (
            <Link href="/api/billing/portal" className="btn btn--outline">Manage</Link>
          ) : (
            <Link href="/api/billing/checkout" className="btn-grad">Upgrade to Premium</Link>
          )}
        </div>
      </div>

      <div className="panel-section">
        <div className="kpi-title" style={{ marginBottom: 8 }}>Today</div>
        <div className="topic-bar">
          <div className="topic-fill" style={{ width: `${Math.min(100, Math.round((used / freeDaily) * 100))}%` }} />
        </div>
        <div className="small muted" style={{ marginTop: 6 }}>
          {Math.min(used, freeDaily)} / {freeDaily} messages
        </div>
      </div>

      <div className="panel-section">
        <h3 className="kpi-title" style={{ fontSize: 14, marginBottom: 8 }}>Unlock Premium Features</h3>
        <div className="row-list">
          <div className="row"><div className="ico">🚀</div><div>Unlimited messages</div></div>
          <div className="row"><div className="ico">🧠</div><div>GPT-4 responses</div></div>
          <div className="row"><div className="ico">🎙️</div><div>Voice conversations</div></div>
          <div className="row"><div className="ico">⚡</div><div>Priority support</div></div>
        </div>
      </div>
    </section>
  );
}
