// components/dashboard/SettingsPanel.tsx
'use client';

import { useState } from 'react';

export default function SettingsPanel({ email }: { email: string }) {
  const [dailyCheckin, setDailyCheckin] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [milestones, setMilestones] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <section className="panel">
      <div className="panel-section">
        <div className="title" style={{ fontWeight: 800, fontSize: 18 }}>Account Settings</div>
        <div className="row">
          <div className="ico">📧</div>
          <div>
            <div className="title">{email}</div>
            <div className="sub">Email</div>
          </div>
          <button className="btn btn--outline btn-sm">Change</button>
        </div>
      </div>

      <div className="panel-section">
        <div className="title" style={{ fontWeight: 800, fontSize: 18 }}>Notifications</div>
        <div className="row">
          <div className="ico">⏰</div>
          <div>
            <div className="title">Daily Check-in Reminder</div>
            <div className="sub">Get a reminder to chat</div>
          </div>
          <input type="checkbox" checked={dailyCheckin} onChange={(e)=>setDailyCheckin(e.target.checked)} />
        </div>
        <div className="row">
          <div className="ico">📈</div>
          <div>
            <div className="title">Weekly Summary</div>
            <div className="sub">See your weekly progress</div>
          </div>
          <input type="checkbox" checked={weeklySummary} onChange={(e)=>setWeeklySummary(e.target.checked)} />
        </div>
        <div className="row">
          <div className="ico">🏅</div>
          <div>
            <div className="title">Milestone Celebrations</div>
            <div className="sub">Get notified about achievements</div>
          </div>
          <input type="checkbox" checked={milestones} onChange={(e)=>setMilestones(e.target.checked)} />
        </div>
        <div className="row">
          <div className="ico">💌</div>
          <div>
            <div className="title">Marketing Emails</div>
            <div className="sub">Updates and special offers</div>
          </div>
          <input type="checkbox" checked={marketing} onChange={(e)=>setMarketing(e.target.checked)} />
        </div>
      </div>

      <div className="panel-section">
        <div className="title" style={{ fontWeight: 800, fontSize: 18, color: '#b91c1c' }}>Danger Zone</div>
        <div className="row">
          <div className="ico">🗑️</div>
          <div>
            <div className="title">Delete All Messages</div>
            <div className="sub">Permanently delete your conversation history</div>
          </div>
          <button className="btn btn--outline btn-sm">Delete</button>
        </div>
        <div className="row">
          <div className="ico">⚠️</div>
          <div>
            <div className="title">Delete Account</div>
            <div className="sub">Permanently delete your account & data</div>
          </div>
          <button className="btn btn--outline btn-sm">Delete</button>
        </div>
      </div>
    </section>
  );
}
