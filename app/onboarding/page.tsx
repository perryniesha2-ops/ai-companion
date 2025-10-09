// app/onboarding/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Tone, Expertise } from '@/types';

type EnergyKey = 'playful' | 'calm' | 'energetic' | 'warm';
type StyleKey  = 'deep' | 'casual' | 'supportive' | 'direct';
type GoalKey   = 'growth' | 'companionship' | 'social' | 'support';

const ENERGY: { key: EnergyKey; label: string; emoji: string; tone: Tone }[] = [
  { key: 'playful',   label: 'Playful & Fun',          emoji: '✨', tone: 'funny' },
  { key: 'calm',      label: 'Calm & Thoughtful',      emoji: '🌙', tone: 'professional' },
  { key: 'energetic', label: 'Energetic & Motivating', emoji: '⚡', tone: 'friendly' },
  { key: 'warm',      label: 'Warm & Caring',          emoji: '💛', tone: 'supportive' },
];

const STYLE: { key: StyleKey; label: string; emoji: string; expertise: Expertise }[] = [
  { key: 'deep',       label: 'Deep conversations',      emoji: '🧠', expertise: 'researcher' },
  { key: 'casual',     label: 'Light & casual',          emoji: '💬', expertise: 'generalist' },
  { key: 'supportive', label: 'Supportive & encouraging',emoji: '🤗', expertise: 'therapist' },
  { key: 'direct',     label: 'Direct & honest',         emoji: '💯', expertise: 'coach' },
];

const GOALS: { key: GoalKey; label: string; emoji: string }[] = [
  { key: 'growth',        label: 'Personal growth',      emoji: '🌱' },
  { key: 'companionship', label: 'Daily companionship',  emoji: '🧑‍🤝‍🧑' },
  { key: 'social',        label: 'Social practice',      emoji: '🎭' },
  { key: 'support',       label: 'Emotional support',    emoji: '❤️' },
];

const STORAGE_KEY = 'companion_onboarding';

export default function OnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sb = useMemo(() => supabaseBrowser(), []);
  const nextPath = params.get('next') || '/dashboard';

  const [step, setStep] = useState(1);
  const [energy, setEnergy] = useState<EnergyKey | null>(null);
  const [style, setStyle]   = useState<StyleKey | null>(null);
  const [goal, setGoal]     = useState<GoalKey | null>(null);
  const [companionName, setCompanionName] = useState('');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 1) Require auth, short-circuit if already onboarded, ensure profile exists
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        router.replace(`/auth/login?next=${encodeURIComponent('/onboarding')}`);
        return;
      }

      // If already onboarded, bounce to next
      const { data: prof } = await sb
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!cancelled && prof?.onboarding_complete) {
        router.replace(nextPath);
        return;
      }

      // Ensure profile row exists (ignore failures)
      await fetch('/api/onboarding', { method: 'PUT', headers: { Authorization: `Bearer ${session.access_token}` } })
        .catch(() => { /* noop */ });

      // Restore local progress (optional)
      if (!cancelled) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const s = JSON.parse(raw);
            if (s.energy) setEnergy(s.energy);
            if (s.style) setStyle(s.style);
            if (s.goal) setGoal(s.goal);
            if (typeof s.name === 'string') setCompanionName(s.name);
            if (typeof s.step === 'number') setStep(Math.min(4, Math.max(1, s.step)));
          } catch { /* ignore */ }
        }
      }
    })();
    return () => { cancelled = true; };
  }, [sb, router, nextPath]);

  // Persist progress
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      energy, style, goal, name: companionName, step
    }));
  }, [energy, style, goal, companionName, step]);

  const canNext = useMemo(() => {
    if (step === 1) return !!energy;
    if (step === 2) return !!style;
    if (step === 3) return !!goal;
    if (step === 4) return companionName.trim().length > 0;
    return false;
  }, [step, energy, style, goal, companionName]);

  async function finish() {
    if (busy || !canNext) return;
    setBusy(true);
    setErr(null);

    const tone: Tone = ENERGY.find(e => e.key === energy)?.tone ?? 'friendly';
    const expertise: Expertise = STYLE.find(s => s.key === style)?.expertise ?? 'generalist';
    const goalText = GOALS.find(g => g.key === goal)?.label ?? 'Personal growth';

    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        setBusy(false);
        router.replace(`/auth/login?next=${encodeURIComponent('/onboarding')}`);
        return;
      }

      // Save & mark onboarding complete on the server
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          nickname: companionName.trim(),
          tone,
          expertise,
          goal: goalText,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to save onboarding');
      }

      // Clear local state and move on
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = `onboarding_done=1; path=/; max-age=${60*60*24*365}`;
      router.replace(nextPath);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card" style={{ width: 'min(820px, 100%)' }}>
        {/* Progress */}
        <div className="progress">
          {[1,2,3,4].map(n => (
            <span key={n} className={`progress-seg ${step>=n ? 'is-full' : ''}`} />
          ))}
        </div>
        <p className="muted small center" style={{ marginTop: 6 }}>Step {step} of 4</p>

        {/* Step 1 */}
        {step === 1 && (
          <section style={{ marginTop: 10 }}>
            <h2 className="auth-title" style={{ fontSize: 26 }}>
              What kind of energy do you want from your companion?
            </h2>
            <div className="quiz-grid">
              {ENERGY.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setEnergy(opt.key)}
                  className={`option-card ${energy===opt.key ? 'is-selected' : ''}`}
                >
                  <span className="option-emoji" aria-hidden>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <section style={{ marginTop: 10 }}>
            <h2 className="auth-title" style={{ fontSize: 26 }}>
              How should your companion communicate?
            </h2>
            <div className="quiz-grid">
              {STYLE.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setStyle(opt.key)}
                  className={`option-card ${style===opt.key ? 'is-selected' : ''}`}
                >
                  <span className="option-emoji">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <section style={{ marginTop: 10 }}>
            <h2 className="auth-title" style={{ fontSize: 26 }}>
              What do you hope to get from this relationship?
            </h2>
            <div className="quiz-grid">
              {GOALS.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setGoal(opt.key)}
                  className={`option-card ${goal===opt.key ? 'is-selected' : ''}`}
                >
                  <span className="option-emoji">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <section style={{ marginTop: 10 }}>
            <h2 className="auth-title" style={{ fontSize: 26 }}>
              What should we call your companion?
            </h2>
            <label className="field" aria-label="Companion name">
              <div className="field-wrap" style={{ padding: '14px 16px' }}>
                <input
                  className="input"
                  value={companionName}
                  onChange={(e) => setCompanionName(e.target.value)}
                  placeholder="Enter a name..."
                  maxLength={60}
                  autoFocus
                />
              </div>
            </label>
          </section>
        )}

        {err && <p className="auth-error" role="alert">{err}</p>}

        {/* Controls */}
        <div className="hstack" style={{ justifyContent: 'space-between', marginTop: 14 }}>
          <button
            className="btn btn--outline"
            onClick={() => setStep(s => Math.max(1, s-1))}
            disabled={step===1 || busy}
            type="button"
          >
            Back
          </button>

          {step < 4 ? (
            <button
              className="btn-grad"
              onClick={() => canNext && setStep(s => s+1)}
              disabled={!canNext || busy}
              type="button"
            >
              Next
            </button>
          ) : (
            <button
              className="btn-grad"
              onClick={finish}
              disabled={!canNext || busy}
              type="button"
            >
              {busy ? 'Creating…' : 'Create My Companion'}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
