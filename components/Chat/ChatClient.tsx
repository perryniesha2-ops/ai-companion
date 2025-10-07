'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };
type ChatApiOk = { text: string; remaining?: number; isPremium?: boolean };
type ChatApiErr = { error?: string };

export default function ChatClient(props: {
  companionName: string;
  isPremium: boolean;
  remaining: number;   // -1 means "unlimited"
  freeDaily: number;
}) {
  const { companionName, freeDaily } = props;
  const [isPremium, setIsPremium] = useState(props.isPremium);
  const [remaining, setRemaining] = useState(props.remaining);

  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', content: "Hey there! I'm so excited to get to know you! 🎉" },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs, sending]);

  const canSend = useMemo(() => !!input.trim() && !sending, [input, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setMsgs((m) => [...m, { role: 'user', content: text }]);
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json().catch(() => ({}))) as ChatApiOk & ChatApiErr;

      if (typeof data.isPremium === 'boolean') setIsPremium(data.isPremium);
      if (typeof data.remaining === 'number') setRemaining(data.remaining);

      if (!res.ok) {
        setMsgs((m) => [...m, { role: 'assistant', content: data.error || 'Sorry, something went wrong.' }]);
      } else {
        setMsgs((m) => [...m, { role: 'assistant', content: data.text }]);
      }
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: 'Network error. Please try again.' }]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) send();
    }
  }

  async function upgrade() {
    const res = await fetch('/api/stripe/checkout', { method: 'POST' });
    const { url } = (await res.json().catch(() => ({}))) as { url?: string };
    if (url) window.location.href = url;
  }

  const footerText =
    isPremium
      ? 'Unlimited messages'
      : `${remaining >= 0 ? remaining : 0} messages left today`;

  return (
    <main className="chat-shell">
      {/* Header with the EXACT name saved during onboarding */}
      <header className="chat-header">
        <div className="avatar"><span className="heart">♡</span></div>
        <div className="title">
          <div className="name">{companionName}</div>
          <div className="status"><span className="dot" /> Online</div>
        </div>
        <button className="menu-btn" aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
            <path d="M3 6h18M3 12h18M3 18h18" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </header>

      {/* Messages */}
      <section ref={listRef} className="chat-main" aria-live="polite">
        <div className="messages">
          {msgs.map((m, i) => <Bubble key={i} role={m.role} text={m.content} />)}
          {sending && <TypingBubble />}
        </div>
      </section>

      {/* Footer */}
      <footer className="chat-footer">
        <div className="usage">
          <span className="muted small">{footerText}</span>
          {!isPremium && (
            <>
              <span className="sep">•</span>
              <button className="link" onClick={upgrade}>Upgrade for unlimited</button>
            </>
          )}
        </div>

        <div className="input-bar">
          <textarea
            className="input input--pill"
            placeholder="Type a message…"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <button className="send-btn" aria-label="Send" onClick={send} disabled={!canSend}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              <path d="M4 12l15-7-4 7 4 7-15-7z" fill="#fff" />
            </svg>
          </button>
        </div>
      </footer>
    </main>
  );
}

function Bubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const isUser = role === 'user';
  return (
    <div className={`bubble ${isUser ? 'bubble--user' : 'bubble--assistant'}`}>
      <div className="bubble-body">{text}</div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="bubble bubble--assistant">
      <div className="typing"><span className="dot1" /><span className="dot2" /><span className="dot3" /></div>
    </div>
  );
}
