'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import SignOutButton from '@/components/auth/SignOutButton';
import ChatMenu from '@/components/menus/ChatMenu';




type Msg = { role: 'user' | 'assistant'; content: string };
type NickRow = { nickname: string | null };
type UsageRow = { count: number };

const FREE_DAILY = 30; // set to your plan (e.g. 30 or 40)

export default function ChatPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [name, setName] = useState<string>('Companion');
  const [used, setUsed] = useState<number>(0);

  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', content: "Hey there! I'm so excited to get to know you! 🎉" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // Fetch header data (nickname + usage)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().slice(0, 10);

      const [{ data: prof }, { data: usage }] = await Promise.all([
        sb
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .returns<NickRow[]>()
          .maybeSingle(),
        sb
          .from('daily_usage')
          .select('count')
          .eq('user_id', user.id)
          .eq('day', today)
          .returns<UsageRow[]>()
          .maybeSingle(),
      ]);

      setName(prof?.nickname?.trim() || 'Companion');
      setUsed(usage?.count ?? 0);
    })();
  }, [sb]);

  // Auto-scroll on new messages
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [msgs, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMsgs((m) => [...m, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsgs((m) => [
          ...m,
          { role: 'assistant', content: data.error || 'Sorry, something went wrong.' },
        ]);
      } else {
        setMsgs((m) => [...m, { role: 'assistant', content: data.text }]);
        setUsed((n) => Math.min(FREE_DAILY, n + 1));
      }
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const left = Math.max(0, FREE_DAILY - used);

  return (
    <main className="chat-shell">
      {/* Header */}
      <header className="chat-header">
        <div className="avatar"><span className="heart">♡</span></div>
        <div className="title">
          <div className="name">{name}</div>
          <div className="status"><span className="dot" /> Online</div>
        </div>

        {/* Simple “menu” placeholder on the right */}
        <button className="menu-btn" aria-label="Menu"> <ChatMenu /></button>
            

      </header>

      {/* Messages */}
      <div className="chat-main" ref={scroller}>
        <div className="messages">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`bubble ${m.role === 'user' ? 'bubble--user' : 'bubble--assistant'}`}
            >
              <div className="bubble-body">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="typing" aria-live="polite">
              <span className="dot1" /> <span className="dot2" /> <span className="dot3" />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="chat-footer">
        <div className="usage small">
          <span>{left} messages left today</span>
          <span className="sep">•</span>
          <Link href="/dashboard?tab=billing">Upgrade for unlimited</Link>
        </div>

        <div className="input-bar">
          <textarea
            className="input--pill"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
          />
          <button className="send-btn" onClick={send} disabled={loading || !input.trim()}>
            ➤
          </button>
        </div>
      </footer>
    </main>
  );
}
