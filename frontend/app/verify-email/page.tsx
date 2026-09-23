'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

function VerifyEmail() {
  const token = useSearchParams().get('token');
  const [state, setState] = useState<'pending' | 'ok' | 'error'>(token ? 'pending' : 'error');
  const [message, setMessage] = useState(token ? '' : 'Lien de vérification incomplet.');
  const called = useRef(false);

  useEffect(() => {
    // Le jeton est à usage unique : un seul appel, même en mode strict de React.
    if (!token || called.current) return;
    called.current = true;
    api('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) })
      .then(() => setState('ok'))
      .catch((e: Error) => {
        setState('error');
        setMessage(e.message);
      });
  }, [token]);

  if (state === 'pending') return <p className="text-gray-500">Vérification en cours…</p>;

  if (state === 'ok') {
    return (
      <>
        <p className="text-4xl" aria-hidden="true">✅</p>
        <h1 className="text-2xl font-bold">Adresse e-mail confirmée</h1>
        <p className="text-gray-700">Merci ! Votre adresse est vérifiée.</p>
        <Link href="/onboarding/identity" className="inline-block rounded-full bg-coeur-500 px-5 py-2 font-medium text-white">
          Continuer
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="text-4xl" aria-hidden="true">⚠️</p>
      <h1 className="text-2xl font-bold">Lien invalide</h1>
      <p className="text-gray-700">{message}</p>
      <p className="text-sm text-gray-500">
        Les liens expirent au bout de 24 heures et ne servent qu’une fois. Connectez-vous pour en
        recevoir un nouveau.
      </p>
      <Link href="/onboarding/verify-email" className="inline-block rounded-full border px-5 py-2 font-medium">
        Recevoir un nouveau lien
      </Link>
    </>
  );
}

/** Page ouverte depuis le lien reçu par e-mail (accessible sans être connecté·e). */
export default function VerifyEmailPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <section className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-sm">
        <Suspense fallback={<p className="text-gray-500">Vérification en cours…</p>}>
          <VerifyEmail />
        </Suspense>
      </section>
    </main>
  );
}
