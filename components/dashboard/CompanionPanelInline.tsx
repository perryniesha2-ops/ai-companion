// components/dashboard/CompanionPanelInline.tsx
import type { OverviewData } from './DashboardTabs';

export default function CompanionPanelInline({ data }: { data: OverviewData }) {
  return (
    <section className="panel">
      <div className="row" style={{ gridTemplateColumns: '48px 1fr auto' }}>
        <div className="avatar"><span className="heart">♡</span></div>
        <div>
          <div className="title" style={{ fontWeight: 800, fontSize: 20 }}>{data.name}</div>
          <div className="muted small">Since {data.sinceISO.slice(0,10)} • {data.daysTogether} days together</div>
        </div>
      </div>

      <div className="panel-section compact-grid">
        <div className="compact-card">
          <div className="kpi-title">Personality</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>Caring</div>
        </div>
        <div className="compact-card">
          <div className="kpi-title">Total Messages</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{data.totalMsgs}</div>
        </div>
        <div className="compact-card">
          <div className="kpi-title">Export</div>
          <button className="btn btn--outline btn-sm">Download chat history</button>
        </div>
        <div className="compact-card">
          <div className="kpi-title">Reset Companion</div>
          <button className="btn btn--outline btn-sm">Start fresh</button>
        </div>
      </div>
    </section>
  );
}
