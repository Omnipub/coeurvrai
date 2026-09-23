'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ReportButton } from '@/components/ReportButton';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { api } from '@/lib/api';
import type { MatchSummary } from '@/types';

export default function ChatPage({ params }: { params: { matchId: string } }) {
  const { matchId } = params;
  const { user } = useAuth();
  const router = useRouter();
  const { messages, send, typing, error, closed, otherTyping } = useChat(matchId);
  const [other, setOther] = useState<MatchSummary['user'] | null>(null);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ matches: MatchSummary[] }>('/api/likes/matches').then(({ matches }) =>
      setOther(matches.find((m) => m.matchId === matchId)?.user ?? null),
    );
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    try {
      await send(content);
      setDraft('');
      setSendError(null);
    } catch (err) {
      setSendError((err as Error).message);
    }
  }

  async function unmatch() {
    if (!confirm('Mettre fin à ce match ? La conversation sera fermée.')) return;
    await api(`/api/likes/matches/${matchId}`, { method: 'DELETE' });
    router.push('/matches');
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <header className="flex items-center justify-between pb-3">
        <h1 className="text-lg font-semibold">{other?.displayName ?? 'Conversation'}</h1>
        <div className="flex items-center gap-3">
          <button onClick={unmatch} className="text-sm text-gray-500 underline">
            Fin du match
          </button>
          {other && <ReportButton reportedId={other.id} onDone={() => router.push('/matches')} />}
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm">
        {messages.map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 ${
                  mine ? 'bg-coeur-500 text-white' : 'bg-gray-100'
                }`}
              >
                {m.content}
              </p>
            </div>
          );
        })}
        {otherTyping && <p className="text-sm italic text-gray-400">écrit…</p>}
        <div ref={bottomRef} />
      </div>

      {(error || sendError || closed) && (
        <p className="pt-2 text-sm text-red-600">
          {closed ? 'Ce match a pris fin.' : (sendError ?? error)}
        </p>
      )}

      <form onSubmit={onSubmit} className="flex gap-2 pt-3">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            typing();
          }}
          maxLength={2000}
          disabled={closed}
          placeholder="Votre message…"
          className="flex-1 rounded-full border px-4 py-2"
        />
        <button
          disabled={closed || !draft.trim()}
          className="rounded-full bg-coeur-500 px-5 py-2 font-medium text-white disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
