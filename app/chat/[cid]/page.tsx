// app/chat/[cid]/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import ChatMenu from '@/components/menus/ChatMenu';

type Msg = { role: 'user' | 'assistant'; content: string; created_at?: string };
type NickRow = { nickname: string | null };

export default function ChatThreadPage() {
  const { cid } = useParams<{ cid: string }>();
  const sb = useMemo(() => supabaseBrowser(), []);

  const [name, setName] = useState<string>('Companion');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // 1) Fetch the companion nickname (same source as new-chat: profiles.nickname)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;

      const { data: prof } = await sb
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .returns<NickRow[]>()      // help TS avoid `never`
        .maybeSingle();

      setName(prof?.nickname?.trim() || 'Companion');
    })();
  }, [sb]);

  // 2) Load existing messages for this conversation
  useEffect(() => {
    (async () => {
      if (!cid) return;
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;

      const { data } = await sb
        .from('messages')
        .select('role, content, created_at')
        .eq('user_id', user.id)
        .eq('conversation_id', cid)
        .order('created_at', { ascending: true });

      setMsgs((data ?? []) as Msg[]);
    })();
  }, [cid, sb]);

  // 3) Autoscroll when messages change
  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      behavior: 'smooth',
    });
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
        body: JSON.stringify({ message: text, conversation_id: cid }),
      });
      const j = await res.json();

      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          content: res.ok ? j.text : j.error || 'Sorry, something went wrong.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="chat-shell">
      {/* Header */}
      <header className="chat-header">
        <div className="avatar"><span className="heart">♡</span></div>
        <div className="title">
          <div className="name">{name}</div>
          <div className="status"><span className="dot" /> Online</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ChatMenu />
        </div>
      </header>

      {/* Messages */}
      <div ref={scroller} className="chat-main">
        <div className="messages">
          {msgs.map((m, i) => (
            <div key={i} className={`bubble ${m.role === 'user' ? 'bubble--user' : 'bubble--assistant'}`}>
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

      {/* Composer */}
      <footer className="chat-footer">
        <div className="input-bar">
          <textarea
            className="input--pill"
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share what's on your mind…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
          />
          <button className="send-btn" onClick={send} disabled={!input.trim() || loading}>✈︎</button>
        </div>
      </footer>
    </main>
  );
}
