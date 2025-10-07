'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';

type Step1 = 'friendly' | 'professional' | 'funny' | 'supportive';
type Step2 = 'generalist' | 'coach' | 'researcher' | 'therapist';

export default function QuizFlow() {
  const [step, setStep] = useState(1);
  const [tone, setTone] = useState<Step1>('friendly');
  const [expertise, setExpertise] = useState<Step2>('generalist');
  const [goal, setGoal] = useState('Be more productive');
  const [nickname, setNickname] = useState('friend');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tone, expertise, goal, nickname }),
    });
    setLoading(false);
    if (res.ok) setDone(true);
  }

  if (done) {
    return <p className="rounded-lg bg-green-50 p-3 text-green-700">Saved! Head over to the chat.</p>;
  }

  return (
    <div className="space-y-6">
      {step === 1 && (
        <section className="space-y-3">
          <h3 className="font-semibold">1/4 • Choose a tone</h3>
          <select className="w-full rounded border p-2" value={tone} onChange={(e)=>setTone(e.target.value as Step1)}>
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
            <option value="funny">Funny</option>
            <option value="supportive">Supportive</option>
          </select>
          <div className="flex justify-end">
            <Button onClick={()=>setStep(2)}>Next</Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <h3 className="font-semibold">2/4 • Pick a style</h3>
          <select className="w-full rounded border p-2" value={expertise} onChange={(e)=>setExpertise(e.target.value as Step2)}>
            <option value="generalist">Generalist</option>
            <option value="coach">Coach</option>
            <option value="researcher">Researcher</option>
            <option value="therapist">Therapist (supportive)</option>
          </select>
          <div className="flex justify-between">
            <Button onClick={()=>setStep(1)}>Back</Button>
            <Button onClick={()=>setStep(3)}>Next</Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <h3 className="font-semibold">3/4 • Your main goal</h3>
          <input className="w-full rounded border p-2" value={goal} onChange={(e)=>setGoal(e.target.value)} />
          <div className="flex justify-between">
            <Button onClick={()=>setStep(2)}>Back</Button>
            <Button onClick={()=>setStep(4)}>Next</Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-3">
          <h3 className="font-semibold">4/4 • What should we call you?</h3>
          <input className="w-full rounded border p-2" value={nickname} onChange={(e)=>setNickname(e.target.value)} />
          <div className="flex justify-between">
            <Button onClick={()=>setStep(3)}>Back</Button>
            <Button loading={loading} onClick={submit}>Finish</Button>
          </div>
        </section>
      )}
    </div>
  );
}
