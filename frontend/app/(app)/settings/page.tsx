'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ExportDataButton } from '@/components/ExportDataButton';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useAuth } from '@/hooks/useAuth';
import { api, formatDate } from '@/lib/api';
import type { AccountInfo } from '@/types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const load = useCallback(() => {
    api<AccountInfo>('/api/account')
      .then(setAccount)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  async function acceptCurrentTerms() {
    await api('/api/account/consent', {
      method: 'POST',
      body: JSON.stringify({ acceptTerms: true, gdprConsent: true }),
    });
    load();
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!account) return <p className="text-gray-500">Chargement…</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Paramètres</h1>

      <Section title="Mon compte">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-gray-500">E-mail</dt>
          <dd className="break-all">{account.email}</dd>
          <dt className="text-gray-500">Membre depuis</dt>
          <dd>{formatDate(account.createdAt)}</dd>
          <dt className="text-gray-500">Dernière activité</dt>
          <dd>{formatDate(account.lastActivityAt)}</dd>
          <dt className="text-gray-500">Dernière adresse IP</dt>
          <dd className="font-mono">{account.lastIp ?? '—'}</dd>
        </dl>
      </Section>

      <Section title="Vérification">
        <ul className="space-y-1 text-sm">
          <li>
            Adresse e-mail :{' '}
            {user?.emailVerified ? (
              <span className="text-green-700">confirmée</span>
            ) : (
              <Link href="/onboarding/verify-email" className="text-coeur-600 underline">
                à confirmer
              </Link>
            )}
          </li>
          <li>
            Identité :{' '}
            {user?.verified ? (
              <VerifiedBadge />
            ) : (
              <Link href="/onboarding/identity" className="text-coeur-600 underline">
                vérifier avec un selfie (facultatif)
              </Link>
            )}
          </li>
        </ul>
      </Section>

      <Section title="Historique des connexions">
        <p className="text-sm text-gray-600">
          Adresses IP utilisées pour vous connecter au cours des 12 derniers mois. Elles sont
          supprimées automatiquement au bout d’un an. Une adresse inconnue ? Changez votre mot
          de passe.
        </p>
        {account.ipLogs.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune connexion enregistrée.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-coeur-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Adresse IP</th>
                </tr>
              </thead>
              <tbody>
                {account.ipLogs.map((log) => (
                  <tr key={`${log.date}-${log.ip}`} className="border-t">
                    <td className="px-3 py-2">{formatDate(log.date)}</td>
                    <td className="break-all px-3 py-2 font-mono">{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Consentements">
        <p className="text-sm">
          CGU et charte acceptées le {formatDate(account.consents.termsAcceptedDate)} (version{' '}
          {account.consents.termsVersion ?? '—'}). Consentement au traitement des données
          sensibles : {formatDate(account.consents.gdprConsentDate)}.
        </p>
        {!account.consents.upToDate && (
          <div className="space-y-2 rounded-lg bg-coeur-50 p-3 text-sm">
            <p>
              Nos textes ont été mis à jour (version {account.consents.currentVersion}). Merci de
              consulter les <Link href="/legal/cgu" className="underline">CGU</Link>, la{' '}
              <Link href="/legal/charte-communaute" className="underline">charte</Link> et la{' '}
              <Link href="/legal/politique-confidentialite" className="underline">
                politique de confidentialité
              </Link>
              .
            </p>
            <button onClick={acceptCurrentTerms} className="rounded-full bg-coeur-500 px-4 py-1.5 text-white">
              J’accepte la nouvelle version
            </button>
          </div>
        )}
        <p className="text-sm text-gray-500">
          Pour retirer votre consentement, supprimez votre compte ci-dessous.
        </p>
      </Section>

      <Section title="Mes données">
        <p className="text-sm text-gray-600">
          Téléchargez une copie de toutes vos données (compte, profil, likes, matchs, messages
          envoyés, signalements, connexions) au format JSON.{' '}
          <Link href="/settings/export-data" className="text-coeur-600 underline">
            En savoir plus
          </Link>
        </p>
        <ExportDataButton />
      </Section>

      <Section title="Supprimer mon compte">
        <p className="text-sm text-gray-600">
          La suppression est définitive : profil, photos, likes, matchs et messages sont effacés.
        </p>
        <Link
          href="/settings/delete-account"
          className="inline-block rounded-full border border-red-600 px-5 py-2 font-medium text-red-700 hover:bg-red-50"
        >
          Supprimer mon compte…
        </Link>
      </Section>
    </div>
  );
}
