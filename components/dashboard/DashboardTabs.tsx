// components/dashboard/DashboardTabs.tsx
'use client';

import { useState } from 'react';
import OverviewPanel from './OverviewPanel';
import CompanionPanelInline from './CompanionPanelInline';
import BillingPanel from './BillingPanel';
import SettingsPanel from './SettingsPanel';

export type TopicSlice = { label: string; pct: number };

export type OverviewData = {
  used: number;
  freeDaily: number;
  totalMsgs: number;
  daysTogether: number;
  streak: number;
  bestStreak: number;
  avgPerDay: number;
  isPremium: boolean;
  userEmail: string;
  name: string;
  sinceISO: string;
  activity?: number[];
  topics?: { label: string; pct: number }[];
};

type Props = {
  initialTab?: 'overview' | 'companion' | 'billing';
  overview: OverviewData;
};

export default function DashboardTabs({
  initialTab = 'overview',
  overview,
}: {
  initialTab?: 'overview' | 'companion' | 'settings' | 'billing';
  overview: OverviewData;
}) {
  const [tab, setTab] = useState<'overview' | 'companion' | 'settings' | 'billing'>(initialTab);

  return (
    <>
      <nav className="tabs" style={{ marginTop: 14 }}>
        <button
          className={`tab ${tab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab ${tab === 'companion' ? 'is-active' : ''}`}
          onClick={() => setTab('companion')}
        >
          💖 Companion
        </button>
        <button
          className={`tab ${tab === 'settings' ? 'is-active' : ''}`}
          onClick={() => setTab('settings')}
        >
          ⚙️ Settings
        </button>
        <button
          className={`tab ${tab === 'billing' ? 'is-active' : ''}`}
          onClick={() => setTab('billing')}
        >
          💳 Billing
        </button>
      </nav>

      {tab === 'overview' && <OverviewPanel data={overview} />}
      {tab === 'companion' && <CompanionPanelInline data={overview} />}
      {tab === 'settings' && <SettingsPanel email={overview.userEmail}  initialPrefs={{ daily_checkin: true, weekly_summary: true, milestone_celebrations: true, marketing_emails: false,}}/>}
      {tab === 'billing' && <BillingPanel data={{used: overview.used,freeDaily: overview.freeDaily,isPremium: overview.isPremium,email: overview.userEmail,}}/>}
    </>
  );
}
