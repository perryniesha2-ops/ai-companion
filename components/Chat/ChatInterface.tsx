'use client';
import { useEffect, useState } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import type { MessageRow } from '@/types';

export default function ChatInterface() {
  const [items, setItems] = useState<ReadonlyArray<MessageRow>>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/me/messages', { method: 'GET' }).catch(() => null);
      if (res?.ok) {
        const json = (await res.json()) as { messages: ReadonlyArray<MessageRow> };
        setItems(json.messages);
      }
    })();
  }, []);

  async function onSend(msg: string) {
    // optimistic add user message
    const optimistic: MessageRow = {
      id: `tmp-${Date.now()}`,
      user_id: 'me',
      content: msg,
      sender: 'user',
      created_at: new Date().toISOString(),
    };
    setItems((prev) => [...prev, optimistic]);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg }),
    });

    if (res.ok) {
      const data = (await res.json()) as { reply: string };
      const ai: MessageRow = {
        id: `tmp-ai-${Date.now()}`,
        user_id: 'me',
        content: data.reply,
        sender: 'ai',
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, ai]);
    } else {
      // revert optimistic? For now just show error bubble
      const aiErr: MessageRow = {
        id: `tmp-err-${Date.now()}`,
        user_id: 'me',
        content: 'Error sending message.',
        sender: 'ai',
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, aiErr]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-4 min-h-[320px]">
        <MessageList items={items} />
      </div>
      <MessageInput onSend={onSend} />
      <p className="text-xs text-slate-500">Free tier: 20 messages/day. Upgrade anytime.</p>
    </div>
  );
}
