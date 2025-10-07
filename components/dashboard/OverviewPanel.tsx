// components/dashboard/OverviewPanel.tsx
import type { OverviewData } from './DashboardTabs';

type Props = { data: OverviewData };

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function OverviewPanel({ data }: Props) {
  const {
    totalMsgs,
    daysTogether,
    streak,
    bestStreak,
    avgPerDay,
    activity = Array(7).fill(0),
    topics = [],
  } = data;

  const max = Math.max(1, ...activity);

  return (
    <section className="panel">
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi">
          <p className="kpi-title">Total Conversations</p>
          <div className="kpi-value">{totalMsgs}</div>
          <div className="kpi-trend"><span className="up">↗</span> +12 this week</div>
        </div>
        <div className="kpi">
          <p className="kpi-title">Days Together</p>
          <div className="kpi-value">{daysTogether}</div>
          <div className="kpi-trend">📅 Since day 1</div>
        </div>
        <div className="kpi">
          <p className="kpi-title">Current Streak</p>
          <div className="kpi-value">{streak} days</div>
          <div className="kpi-trend">🏅 Best: {bestStreak} days</div>
        </div>
        <div className="kpi">
          <p className="kpi-title">Avg. Messages/Day</p>
          <div className="kpi-value">{avgPerDay}</div>
          <div className="kpi-trend"><span className="up">↗</span> Above average</div>
        </div>
      </div>

      {/* Activity */}
      <div className="panel-section">
        <p className="kpi-title">Activity This Week</p>
        <div className="spark">
          {activity.map((v, i) => (
            <div className="spark-col" key={i}>
              <div
                className="spark-bar"
                style={{ height: `${(v / max) * 36 + 6}px` }}
                aria-label={`${DAYS[i]}: ${v} messages`}
                title={`${DAYS[i]}: ${v}`}
              />
              <div className="spark-day">{DAYS[i]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div className="panel-section topics">
        <p className="kpi-title">Top Discussion Topics</p>
        {topics.length === 0 ? (
          <div className="empty">No topics yet</div>
        ) : (
          topics.map((t) => (
            <div className="topic-row" key={t.label}>
              <span className="topic-name">{t.label}</span>
              <div className="topic-bar">
                <div className="topic-fill" style={{ width: `${t.pct}%` }} />
              </div>
              <span className="topic-pct">{t.pct}%</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
