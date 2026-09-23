'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { api } from '@/lib/api';
import type { MatchSummary } from '@/types';

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ matches: MatchSummary[] }>('/api/likes/matches')
      .then(({ matches }) => setMatches(matches))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!matches) return <p className="text-gray-500">Chargement…</p>;
  if (matches.length === 0) {
    return <p className="py-12 text-center text-gray-500">Pas encore de match. Continuez à découvrir !</p>;
  }

  return (
    <ul className="divide-y rounded-2xl bg-white shadow-sm">
      {matches.map((m) => (
        <li key={m.matchId}>
          <Link href={`/chat/${m.matchId}`} className="flex items-center gap-3 p-4 hover:bg-coeur-50">
            <div className="h-12 w-12 flex-none overflow-hidden rounded-full bg-coeur-100">
              {m.user.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.user.photo} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium">
                {m.user.displayName} {m.user.verified && <VerifiedBadge size="sm" />}
              </p>
              <p className="truncate text-sm text-gray-500">
                {m.lastMessage?.content ?? 'Nouveau match — dites bonjour !'}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
