'use client';

import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';

export type Prefs = {
  daily_checkin: boolean;
  weekly_summary: boolean;
  milestone_celebrations: boolean;
  marketing_emails: boolean;

  daily_checkin_time: string;   // "HH:mm"
  daily_checkin_days: string;   // "mon,tue,wed,thu,fri"
  weekly_summary_time: string;  // "HH:mm"
  weekly_summary_day: string;   // "sun"
  timezone: string;             // IANA tz, e.g. "UTC"
  channel_email: boolean;
  channel_inapp: boolean;
};

const DEFAULTS: Prefs = {
  daily_checkin: true,
  weekly_summary: true,
  milestone_celebrations: true,
  marketing_emails: false,

  daily_checkin_time: '09:00',
  daily_checkin_days: 'mon,tue,wed,thu,fri',
  weekly_summary_time: '17:00',
  weekly_summary_day: 'sun',
  timezone: 'UTC',
  channel_email: true,
  channel_inapp: true,
};

function withDefaults(p?: Partial<Prefs> | null): Prefs {
  return { ...DEFAULTS, ...(p ?? {}) };
}

const DAYS = [
  { value: 'sun', label: 'Sunday' },
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
];

export default function SettingsPanel({
  email,
  initialPrefs,
}: {
  email: string;
  initialPrefs?: Partial<Prefs> | null;
}) {
  // Main prefs state
  const [prefs, setPrefs] = useState<Prefs>(() => withDefaults(initialPrefs));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Improve default timezone to the user's local
  const localTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    []
  );
  useEffect(() => {
    setPrefs((p) => (p.timezone ? p : { ...p, timezone: localTz }));
  }, [localTz]);

  // Hydrate if parent provides later
  useEffect(() => setPrefs(withDefaults(initialPrefs)), [initialPrefs]);

  async function persist(next: Prefs) {
    const res = await fetch('/api/preferences', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || 'Failed to save preferences');
    }
  }

  async function save(next: Prefs) {
    try {
      setSaving(true);
      setErr(null);
      setOk(null);
      await persist(next);
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
    // For weekly_summary we open a modal instead of saving immediately when enabling
    if (key === 'weekly_summary' && next.weekly_summary) {
      setWeeklyDraft({
        weekly_summary_time: next.weekly_summary_time,
        weekly_summary_day: next.weekly_summary_day,
        timezone: next.timezone,
        channel_email: next.channel_email,
        channel_inapp: next.channel_inapp,
      });
      setOpenedByToggle(true);
      setShowWeeklyModal(true);
    } else {
      save(next);
    }
  }

  // --- Weekly modal state ---
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [openedByToggle, setOpenedByToggle] = useState(false);
  const [weeklyDraft, setWeeklyDraft] = useState<{
    weekly_summary_time: string;
    weekly_summary_day: string;
    timezone: string;
    channel_email: boolean;
    channel_inapp: boolean;
  } | null>(null);

  function closeWeeklyModal() {
    // If modal was opened by turning the switch on and user cancels, revert the toggle
    if (openedByToggle) {
      setPrefs((p) => ({ ...p, weekly_summary: false }));
      setOpenedByToggle(false);
    }
    setShowWeeklyModal(false);
  }

  async function saveWeeklyModal() {
    if (!weeklyDraft) return closeWeeklyModal();
    const next: Prefs = {
      ...prefs,
      weekly_summary: true, // ensure it stays on
      weekly_summary_time: weeklyDraft.weekly_summary_time,
      weekly_summary_day: weeklyDraft.weekly_summary_day,
      timezone: weeklyDraft.timezone,
      channel_email: weeklyDraft.channel_email,
      channel_inapp: weeklyDraft.channel_inapp,
    };
    setPrefs(next);
    setOpenedByToggle(false);
    setShowWeeklyModal(false);
    await save(next);
  }

  // Simple setters for modal fields
  const setDraft = <K extends keyof NonNullable<typeof weeklyDraft>>(k: K, v: NonNullable<typeof weeklyDraft>[K]) =>
    setWeeklyDraft((d) => ({ ...(d as any), [k]: v }));

  return (
    <div className="panel">
      {/* Account settings */}
      <div className="panel">
        <h3 className="kpi-title" style={{ fontSize: 16 }}>Account</h3>
            <div className="ico">📧</div>
              <div className="title">Email</div>
              <div className="sub">{email}</div>
          </div>
          

      {/* Notifications – decluttered */}
      <div className="panel">
        <h3 className="kpi-title" style={{ fontSize: 16 }}>Notifications</h3>
        <div className="row-list" style={{ marginTop: 10 }}>
          {/* Daily Check-In */}
          <div className="row">
            <div className="ico">⏰</div>
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

         

          {/* Milestones */}
          <div className="row">
            <div className="ico">🏅</div>
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

          {/* Marketing */}
          <div className="row">
            <div className="ico">💌</div>
            <div>
              <div className="title">Marketing Emails</div>
              <div className="sub">Product updates & offers</div>
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


         {/* Weekly Summary – opens modal when enabled */}
          <div className="row">
            <div className="ico">📈</div>
            <div className="hstack" style={{ justifyContent: 'space-between', width: '100%' }}>
              <div>
                <div className="title">Weekly Summary</div>
                <div className="sub">A brief email recap of your week</div>
              </div>
              <div className="hstack" style={{ gap: 8 }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setWeeklyDraft({
                      weekly_summary_time: prefs.weekly_summary_time,
                      weekly_summary_day: prefs.weekly_summary_day,
                      timezone: prefs.timezone,
                      channel_email: prefs.channel_email,
                      channel_inapp: prefs.channel_inapp,
                    });
                    setOpenedByToggle(false);
                    setShowWeeklyModal(true);
                  }}
                >
                  Configure
                </button>
                 
              </div>
            </div>
          </div>
      </div>

      

      {/* Danger zone */}
      <div className="panel">
        <h3 className="kpi-title" style={{ fontSize: 16, color: '#b91c1c' }}>Danger Zone</h3>
        <div className="row-list" style={{ marginTop: 10 }}>
          <div className="row">
            <div className="ico">🗑️</div>
            <div>
              <div className="title">Delete All Messages</div>
              <div className="sub">This cannot be undone</div>
            </div>
            <button className="btn-danger" onClick={async () => {
              if (!confirm('Delete ALL messages?')) return;
              const res = await fetch('/api/messages/delete-all', { method: 'POST' });
              alert(res.ok ? 'All messages deleted.' : 'Failed to delete messages.');
            }}>
              Delete
            </button>
          </div>

          <div className="row">
            <div className="ico">⚠️</div>
            <div>
              <div className="title">Delete Account</div>
              <div className="sub">Remove account & all data</div>
            </div>
            <button className="btn-danger" onClick={async () => {
              if (!confirm('Delete your account and all data?')) return;
              const res = await fetch('/api/account/delete', { method: 'POST' });
              if (res.ok) window.location.href = '/';
              else alert('Failed to delete account.');
            }}>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Summary Modal */}
      <Modal
        open={showWeeklyModal}
        title="Weekly Summary Preferences"
        onClose={closeWeeklyModal}
        footer={
          <>
            <button className="btn" onClick={closeWeeklyModal}>Cancel</button>
            <button className="btn btn--gradient" onClick={saveWeeklyModal} disabled={saving}>
              Save
            </button>
          </>
        }
      >
        {weeklyDraft && (
          <div className="vstack" style={{ gap: 12 }}>
            <div className="field">
              <div className="kpi-title">Send Time</div>
              <input
                type="time"
                className="input"
                value={weeklyDraft.weekly_summary_time}
                onChange={(e) => setDraft('weekly_summary_time', e.currentTarget.value)}
              />
            </div>

            <div className="field">
              <div className="kpi-title">Day of Week</div>
              <select
                className="input"
                value={weeklyDraft.weekly_summary_day}
                onChange={(e) => setDraft('weekly_summary_day', e.currentTarget.value)}
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <div className="kpi-title">Timezone</div>
              <input
                type="text"
                className="input"
                placeholder="UTC or America/New_York"
                value={weeklyDraft.timezone}
                onChange={(e) => setDraft('timezone', e.currentTarget.value)}
              />
            </div>

            <div className="hstack" style={{ gap: 12 }}>
              <label className="hstack" style={{ gap: 6 }}>
                <input
                  type="checkbox"
                  checked={weeklyDraft.channel_email}
                  onChange={(e) => setDraft('channel_email', e.currentTarget.checked)}
                />
                <span>Email</span>
              </label>
              <label className="hstack" style={{ gap: 6 }}>
                <input
                  type="checkbox"
                  checked={weeklyDraft.channel_inapp}
                  onChange={(e) => setDraft('channel_inapp', e.currentTarget.checked)}
                />
                <span>In-app</span>
              </label>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
