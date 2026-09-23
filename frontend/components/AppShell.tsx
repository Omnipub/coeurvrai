'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { NavBar } from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';

/**
 * Coquille de l'espace membre : redirige vers /login si non connecté.
 * Aucun contenu privé n'est rendu côté serveur (le HTML initial ne contient
 * que « Chargement… »), ce qui empêche toute fuite vers un robot.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main id="contenu" className="p-8 text-center text-gray-600">
        Chargement…
      </main>
    );
  }

  return (
    <>
      <NavBar />
      <main id="contenu" className="mx-auto w-full max-w-2xl px-4 py-6">
        {children}
      </main>
    </>
  );
}
