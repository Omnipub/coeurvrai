'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { NavBar } from '@/components/NavBar';
import { useAuth } from '@/hooks/useAuth';

/** Espace membre : redirige vers /login si non connecté. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <p className="p-8 text-center text-gray-500">Chargement…</p>;
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </>
  );
}
