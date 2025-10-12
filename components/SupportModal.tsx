'use client';

import { useState } from 'react';

type Props = { open: boolean; onClose: () => void; };

export default function SupportModal({ open, onClose }: Props) {
  const [email, setEmail]     = useState('');
  const [name, setName]       = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy]       = useState(false);
  const [ok, setOk]           = useState<string | null>(null);
  const [err, setErr]         = useState<string | null>(null);
  const [left, setLeft]       = useState(500);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null); setOk(null);

    const hp = ''; // honeypot stays empty
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ email, subject, message, name, hp }),
    });

    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error || 'Failed to send. Please try again.');
      setBusy(false);
      return;
    }
    setOk('Thanks! Your message has been sent.');
    setBusy(false);
    setEmail(''); setName(''); setSubject(''); setMessage('');
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <div className="modal-title">Contact Support</div>
          <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="modal-body vstack" onSubmit={submit}>
          {/* Hidden honeypot */}
          <input
            aria-hidden
            tabIndex={-1}
            autoComplete="off"
            name="company"
            style={{ position:'absolute', left:'-9999px', height:0, width:0 }}
            onChange={() => {}}
          />

          <label className="field">
            <div className="field-wrap">
              <span className="field-icon">👤</span>
              <input className="input" placeholder="Your name (optional)"
                     value={name} onChange={e => setName(e.target.value)} />
            </div>
          </label>

          <label className="field">
            <div className="field-wrap">
              <span className="field-icon">📧</span>
              <input className="input" type="email" required placeholder="you@domain.com"
                     value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </label>

          <label className="field">
            <div className="field-wrap">
              <span className="field-icon">📝</span>
              <input className="input" required placeholder="Subject"
                     value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
          </label>

          <label className="field">
            <div className="field-wrap" style={{ alignItems:'stretch' }}>
              <textarea
                className="input textarea"
                required
                rows={5}
                maxLength={500}
                placeholder="Describe the issue…"
                value={message}
                onChange={e => { setMessage(e.target.value); setLeft(500 - e.target.value.length); }}
              />
            </div>
            <div className="small muted" style={{ marginTop:6, textAlign:'right' }}>
              {left} characters left
            </div>
          </label>

          {err && <p className="auth-error" role="alert">{err}</p>}
          {ok && <p className="small" style={{ color:'var(--success)' }}>{ok}</p>}

          <div className="modal-foot">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--gradient" disabled={busy || !email || !subject || !message}>
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
