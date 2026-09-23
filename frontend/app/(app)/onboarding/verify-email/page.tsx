'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

/** Étape 1 après l'inscription : confirmer son adresse e-mail. */
export default function VerifyEmailStep() {
  const { user, refresh } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Vérifie périodiquement si le lien a été ouvert (autre onglet ou téléphone).
  useEffect(() => {
    if (user?.emailVerified) return;
    const timer = setInterval(() => refresh().catch(() => undefined), 5000);
    return () => clearInterval(timer);
  }, [user?.emailVerified, refresh]);

  async function resend() {
    setPending(true);
    setError(null);
    try {
      await api('/api/auth/send-verification-email', { method: 'POST' });
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (user?.emailVerified) {
    return (
      <section className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-4xl" aria-hidden="true">✅</p>
        <h1 className="text-2xl font-bold">Adresse e-mail confirmée</h1>
        <p className="text-gray-700">Merci ! Une dernière étape facultative pour obtenir le badge « Profil vérifié ».</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/onboarding/identity" className="rounded-full bg-coeur-500 px-5 py-2 font-medium text-white">
            Vérifier mon identité
          </Link>
          <Link href="/discover" className="rounded-full border px-5 py-2 font-medium">
            Plus tard
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-sm">
      <p className="text-4xl" aria-hidden="true">✉️</p>
      <h1 className="text-2xl font-bold">Vérifiez votre adresse e-mail</h1>
      <p className="text-gray-700">
        Nous avons envoyé un lien de confirmation à <strong className="break-all">{user?.email}</strong>.
        Ouvrez-le pour confirmer votre adresse. Il est valable 24 heures.
      </p>
      <p className="text-sm text-gray-500">
        Rien reçu ? Vérifiez vos courriers indésirables, ou demandez un nouveau lien.
      </p>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={resend}
          disabled={pending}
          className="rounded-full border border-coeur-500 px-5 py-2 font-medium text-coeur-600 disabled:opacity-50"
        >
          {pending ? 'Envoi…' : 'Renvoyer le lien'}
        </button>
        {sent && <p className="text-sm text-green-700">Un nouveau lien vient d’être envoyé.</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <Link href="/discover" className="block text-sm text-gray-500 underline">
        Continuer sans attendre
      </Link>
    </section>
  );
}
