// components/dashboard/CompanionPanelInline.tsx
import type { OverviewData } from './DashboardTabs';
import CompanionStartButton from '../CompanionStartButton';
import ResetCompanionButton from './ResetCompanionButton';
import { useState } from 'react';

type Props = {
  data: OverviewData;
  personaLabel?: string;
  companionId?: string | null;
  conversationId?: string | null;
};

export default function CompanionPanelInline({
  data,
  personaLabel = 'Caring',
  companionId = null,
  conversationId = null,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleExport() {
    // Minimal example — swap with your actual export route
    const res = await fetch('/api/export', { method: 'POST' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleReset() {
    setConfirmOpen(true);
  }
  async function confirmReset() {
    setConfirmOpen(false);
    // Call your reset API here
    // await fetch('/api/companion/reset', { method: 'POST' });
    alert('Companion reset (stub)'); // replace
  }

  return (
    <section className="panel comp-panel">
      {/* Header */}
      <div className="comp-header">
        <div className="row" style={{ gridTemplateColumns: '48px 1fr' }}>
          <div className="avatar"><span className="heart">♡</span></div>
          <div>
            <div className="title" style={{ fontWeight: 800, fontSize: 20 }}>{data.name}</div>
            <div className="muted small">
              {personaLabel} • {data.daysTogether} Days Together
            </div>
          </div>
        </div>

        <div className="header-actions">
          <CompanionStartButton
            companionId={companionId ?? undefined}
            label={conversationId ? 'Resume Chat' : 'Open Chat'}
          />
          
        </div>
      </div>

      {/* Pastel info strips */}
      <div className="stat-grid">
        <div className="info-strip info--lav">
          <div className="strip-title">Personality</div>
          <div className="strip-value">{personaLabel}</div>
        </div>
        <div className="info-strip info--rose">
          <div className="strip-title">Total Messages</div>
          <div className="strip-value">{data.totalMsgs}</div>
        </div>
        <div className="info-strip info--blue">
          <div className="strip-title">Since</div>
          <div className="strip-value">{data.sinceISO.slice(0,10)}</div>
        </div>
<div className="hstack" style={{ gap: 10, marginTop: 12 }}>
  <button className="btn-primary" onClick={handleExport}>⤓ Export</button>
  <ResetCompanionButton />
</div>

      </div>

      {/* Confirm modal (lightweight) */}
      {confirmOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Confirm reset">
          <div className="modal">
            <h3 className="auth-title" style={{ marginTop: 0 }}>Reset companion?</h3>
            <p className="muted" style={{ marginTop: -8 }}>
              This will clear the current personality and start fresh.
            </p>
            <div className="hstack" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
              <button className="btn" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="btn btn--gradient" onClick={confirmReset}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
