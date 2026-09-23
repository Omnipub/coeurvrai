'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { api } from '@/lib/api';
import type { OnfidoStatus, VerificationStatus } from '@/types';

type OnfidoHandle = { tearDown: () => Promise<void> };

const STATUS_TEXT: Record<OnfidoStatus, string> = {
  awaiting_input: 'Vérification commencée mais non terminée.',
  processing: 'Vérification en cours d’analyse. Le résultat arrive en général en quelques minutes.',
  review: 'Vérification en cours d’examen manuel.',
  approved: 'Identité vérifiée.',
  declined: 'La vérification n’a pas abouti. Vous pouvez réessayer.',
  abandoned: 'Vérification abandonnée. Vous pouvez réessayer.',
  error: 'Une erreur est survenue. Vous pouvez réessayer.',
};

const CAN_START: (OnfidoStatus | null)[] = [null, 'awaiting_input', 'abandoned', 'error', 'declined'];

/** Étape facultative : vérification d'identité par selfie (Onfido). */
export default function IdentityStep() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'capture' | 'submitted'>('idle');
  const [error, setError] = useState<string | null>(null);
  const handle = useRef<OnfidoHandle | null>(null);

  const load = useCallback(() => {
    api<VerificationStatus>('/api/verification/status')
      .then(setStatus)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    return () => {
      handle.current?.tearDown().catch(() => undefined);
    };
  }, [load]);

  // Après la capture, on attend le résultat (webhook Onfido côté serveur).
  useEffect(() => {
    if (phase !== 'submitted') return;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [phase, load]);

  async function start() {
    setPhase('loading');
    setError(null);
    try {
      const { sdkToken, workflowRunId } = await api<{ sdkToken: string; workflowRunId: string }>(
        '/api/verification/onfido-token',
        { method: 'POST', body: JSON.stringify({ consent: true }) },
      );
      // Chargé à la demande : le SDK n'est téléchargé que par les personnes qui l'utilisent.
      const { Onfido } = await import('onfido-sdk-ui');
      setPhase('capture');
      handle.current = Onfido.init({
        token: sdkToken,
        workflowRunId,
        containerId: 'onfido-mount',
        language: 'fr_FR',
        disableAnalyticsCookies: true,
        onComplete: () => {
          handle.current?.tearDown().catch(() => undefined);
          handle.current = null;
          setPhase('submitted');
          load();
        },
        onError: (err) => {
          setError(err.message || 'La vérification a échoué.');
          setPhase('idle');
        },
        onUserExit: () => setPhase('idle'),
      });
    } catch (e) {
      setError((e as Error).message);
      setPhase('idle');
    }
  }

  if (!status) {
    return error ? <p className="text-red-600">{error}</p> : <p className="text-gray-500">Chargement…</p>;
  }

  const canStart = CAN_START.includes(status.onfidoStatus) && phase === 'idle';

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-coeur-600">Étape facultative</p>
        <h1 className="text-2xl font-bold">Vérifier votre identité</h1>
        <p className="text-gray-700">
          Obtenez le badge <VerifiedBadge /> en prouvant que vous êtes une vraie personne,
          grâce à un court selfie vidéo. Les membres vérifiés inspirent davantage confiance.
        </p>

        <ul className="space-y-1 text-sm text-gray-700">
          <li>✓ Environ 1 minute, depuis votre téléphone ou votre ordinateur (caméra requise)</li>
          <li>✓ Aucun nom ni document n’est affiché sur votre profil : seul le badge est visible</li>
          <li>
            ✓ Réalisée par notre prestataire Onfido ; coeur-vrai ne conserve que le résultat
            (vérifié ou non)
          </li>
        </ul>

        <div className="rounded-lg bg-coeur-50 p-3 text-sm">
          <p className="font-medium">
            Adresse e-mail :{' '}
            {status.emailVerified ? (
              <span className="text-green-700">confirmée</span>
            ) : (
              <>
                <span className="text-amber-700">à confirmer</span> —{' '}
                <Link href="/onboarding/verify-email" className="underline">
                  renvoyer le lien
                </Link>
              </>
            )}
          </p>
          <p className="font-medium">
            Selfie :{' '}
            {status.onfidoStatus ? STATUS_TEXT[status.onfidoStatus] : 'non vérifié.'}
          </p>
          {status.verifiedBadge && (
            <p className="mt-1 text-green-700">Votre profil affiche le badge « Profil vérifié ». 🎉</p>
          )}
          {status.onfidoStatus === 'approved' && !status.emailVerified && (
            <p className="mt-1">Confirmez votre e-mail pour activer le badge.</p>
          )}
        </div>

        {!status.onfidoAvailable ? (
          <p className="text-sm text-gray-500">
            La vérification d’identité n’est pas encore disponible. Revenez bientôt !
          </p>
        ) : (
          canStart && (
            <>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  J’accepte que mon selfie vidéo soit analysé par Onfido pour vérifier que je suis
                  une personne réelle. Ces données biométriques sont traitées uniquement à cette fin (
                  <Link href="/legal/politique-confidentialite#verification" target="_blank" className="underline">
                    en savoir plus
                  </Link>
                  ).
                </span>
              </label>
              <button
                onClick={start}
                disabled={!consent}
                className="rounded-full bg-coeur-500 px-5 py-2 font-medium text-white disabled:opacity-50"
              >
                Commencer la vérification
              </button>
            </>
          )
        )}

        {phase === 'loading' && <p className="text-sm text-gray-500">Préparation…</p>}
        {phase === 'submitted' && status.onfidoStatus !== 'approved' && (
          <p className="text-sm text-gray-700">
            Merci ! Votre selfie a été transmis. Le résultat s’affichera ici automatiquement.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>

      <div id="onfido-mount" className={phase === 'capture' ? 'min-h-[600px]' : 'hidden'} />

      <Link href="/discover" className="block text-center text-sm text-gray-500 underline">
        {status.verifiedBadge ? 'Continuer' : 'Passer cette étape'}
      </Link>
    </div>
  );
}
