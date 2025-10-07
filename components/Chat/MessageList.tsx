import type { MessageRow } from '@/types';

export default function MessageList({ items }: { items: ReadonlyArray<MessageRow> }) {
  return (
    <div className="space-y-3">
      {items.map((m) => (
        <div key={m.id} className={m.sender === 'user' ? 'text-right' : 'text-left'}>
          <div
            className={`inline-block rounded-2xl px-4 py-2 ${
              m.sender === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100'
            }`}
          >
            {m.content}
          </div>
        </div>
      ))}
    </div>
  );
}
