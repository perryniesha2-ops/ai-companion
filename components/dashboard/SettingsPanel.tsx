'use client';

import { useState } from 'react';

export type Prefs = {
  daily_checkin: boolean;
  weekly_summary: boolean;
  milestone_celebrations: boolean;
  marketing_emails: boolean;
};

const DEFAULT_PREFS: Prefs = {
  daily_checkin: true,
  weekly_summary: true,
  milestone_celebrations: true,
  marketing_emails: false,
};

export default function SettingsPanel({
  email,
  initialPrefs,
}: {
  email?: string | null;
  initialPrefs?: Partial<Prefs>;
}) {
  // Merge provided prefs with defaults to avoid undefined errors
  const [prefs, setPrefs] = useState<Prefs>({
    ...DEFAULT_PREFS,
    ...(initialPrefs ?? {}),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function save(next: Prefs) {
    try {
      setSaving(true);
      setErr(null);
      setOk(null);
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to save preferences');
      }
      setOk('Saved');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    void save(next);
  }

  async function deleteAllMessages() {
    if (!confirm('Delete ALL messages? This cannot be undone.')) return;
    const res = await fetch('/api/messages/delete-all', { method: 'POST' });
    if (!res.ok) alert('Failed to delete messages.');
    else alert('All messages deleted.');
  }

  async function deleteAccount() {
    if (!confirm('Delete your account and all data? This cannot be undone.')) return;
    const res = await fetch('/api/account/delete', { method: 'POST' });
    if (!res.ok) alert('Failed to delete account.');
    else window.location.href = '/';
  }

  return (
    <div className="panel-stack">
      {/* Account settings */}
      <section className="panel">
        <h3 className="kpi-title" style={{ fontSize: 16 }}>Account Settings</h3>

        <div className="row-list" style={{ marginTop: 10 }}>
          <div className="row">
            <div className="ico" aria-hidden>📧</div>
            <div>
              <div className="title">Email</div>
              <div className="sub">{email ?? '—'}</div>
            </div>
            {/* Hook this up to your real change-email flow if needed */}
            <a className="btn-primary" href="/auth/login">Change</a>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="panel">
        <h3 className="kpi-title" style={{ fontSize: 16 }}>Notifications</h3>

        <div className="row-list" style={{ marginTop: 10 }}>
          <div className="row">
            <div className="ico" aria-hidden>⏰</div>
            <div>
              <div className="title">Daily Check-in Reminder</div>
              <div className="sub">Get a reminder to chat</div>
            </div>
            <button
              className={`switch ${prefs.daily_checkin ? 'is-on' : ''}`}
              role="switch"
              aria-checked={prefs.daily_checkin}
              onClick={() => toggle('daily_checkin')}
              disabled={saving}
            />
          </div>

          <div className="row">
            <div className="ico" aria-hidden>📈</div>
            <div>
              <div className="title">Weekly Summary</div>
              <div className="sub">See your weekly progress</div>
            </div>
            <button
              className={`switch ${prefs.weekly_summary ? 'is-on' : ''}`}
              role="switch"
              aria-checked={prefs.weekly_summary}
              onClick={() => toggle('weekly_summary')}
              disabled={saving}
            />
          </div>

          <div className="row">
            <div className="ico" aria-hidden>🏅</div>
            <div>
              <div className="title">Milestone Celebrations</div>
              <div className="sub">Get notified about achievements</div>
            </div>
            <button
              className={`switch ${prefs.milestone_celebrations ? 'is-on' : ''}`}
              role="switch"
              aria-checked={prefs.milestone_celebrations}
              onClick={() => toggle('milestone_celebrations')}
              disabled={saving}
            />
          </div>

          <div className="row">
            <div className="ico" aria-hidden>💌</div>
            <div>
              <div className="title">Marketing Emails</div>
              <div className="sub">Updates and special offers</div>
            </div>
            <button
              className={`switch ${prefs.marketing_emails ? 'is-on' : ''}`}
              role="switch"
              aria-checked={prefs.marketing_emails}
              onClick={() => toggle('marketing_emails')}
              disabled={saving}
            />
          </div>
        </div>

        {(err || ok) && (
          <p className={`small ${err ? 'auth-error' : 'muted'}`} style={{ marginTop: 10 }}>
            {err || ok}
          </p>
        )}
      </section>

      {/* Danger zone */}
      <section className="panel">
        <h3 className="kpi-title" style={{ fontSize: 16, color: '#b91c1c' }}>Danger Zone</h3>

        <div className="row-list" style={{ marginTop: 10 }}>
          <div className="row">
            <div className="ico" aria-hidden>🗑️</div>
            <div>
              <div className="title">Delete All Messages</div>
              <div className="sub">Permanently delete your conversation history</div>
            </div>
            <button className="btn-danger " onClick={deleteAllMessages}>
                Delete
            </button>
          </div>

          <div className="row">
            <div className="ico" aria-hidden>⚠️</div>
            <div>
              <div className="title">Delete Account</div>
              <div className="sub">Permanently delete your account &amp; data</div>
            </div>
            <button className="btn-danger" onClick={deleteAccount}>
              Delete
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
