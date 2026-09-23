'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProfileCard } from '@/components/ProfileCard';
import { api } from '@/lib/api';
import type { Profile } from '@/types';

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ profiles: Profile[] }>('/api/profiles/discover')
      .then(({ profiles }) => setProfiles(profiles))
      .catch((e: Error) => setError(e.message));
  }, []);

  const current = profiles?.[0];
  const next = () => setProfiles((p) => (p ? p.slice(1) : p));

  async function like() {
    if (!current) return;
    try {
      const res = await api<{ matched: boolean; matchId: string | null }>(`/api/likes/${current.id}`, {
        method: 'POST',
      });
      if (res.matched) setMatchId(res.matchId);
      next();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!profiles) return <p className="text-gray-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      {matchId && (
        <div className="rounded-xl bg-coeur-500 p-4 text-center text-white">
          C&apos;est un match ! 💕{' '}
          <Link href={`/chat/${matchId}`} className="font-semibold underline">
            Envoyer un message
          </Link>
        </div>
      )}
      {current ? (
        <ProfileCard profile={current} onLike={like} onPass={next} />
      ) : (
        <p className="py-12 text-center text-gray-500">
          Plus de profils pour le moment. Revenez bientôt !
        </p>
      )}
    </div>
  );
}
