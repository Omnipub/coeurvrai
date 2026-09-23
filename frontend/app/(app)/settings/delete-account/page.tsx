'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, setToken } from '@/lib/api';

export default function DeleteAccountPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMatches = email.trim().toLowerCase() === user?.email.toLowerCase();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!emailMatches || !understood) return;
    setPending(true);
    setError(null);
    try {
      await api('/api/account/delete', {
        method: 'DELETE',
        body: JSON.stringify({ email, password }),
      });
      // Rechargement complet plutôt que logout() : sinon le layout de l'espace
      // membre redirige vers /login avant d'afficher la confirmation.
      setToken(null);
      window.location.replace('/?compte=supprime');
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-800">
        ← Paramètres
      </Link>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-red-700">Supprimer mon compte</h1>

        <div className="rounded-lg border-l-4 border-red-600 bg-red-50 p-4 text-sm text-gray-800">
          <p className="mb-2 font-semibold">Cette action est définitive et irréversible.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>votre profil et vos photos seront effacés ;</li>
            <li>vos likes, vos matchs et toutes vos conversations seront supprimés ;</li>
            <li>vos blocages et signalements seront supprimés ;</li>
            <li>vos matchs ne pourront plus vous écrire.</li>
          </ul>
          <p className="mt-2">
            Vous souhaitez garder une copie ?{' '}
            <Link href="/settings/export-data" className="font-medium text-coeur-600 underline">
              Exportez d’abord vos données
            </Link>
            .
          </p>
        </div>

        <label className="block text-sm">
          Pour confirmer, saisissez l’adresse e-mail de votre compte
          <input
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={user?.email}
            className="mt-1 w-full rounded-lg border p-3"
          />
        </label>
        {email && !emailMatches && (
          <p className="text-sm text-red-600">L’adresse ne correspond pas à votre compte.</p>
        )}

        <label className="block text-sm">
          Mot de passe
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border p-3"
          />
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-1"
          />
          <span>Je comprends que mon compte et toutes mes données seront définitivement supprimés.</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/settings"
            className="rounded-full border px-5 py-2 text-center font-medium hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={pending || !emailMatches || !understood || !password}
            className="rounded-full bg-red-600 px-5 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? 'Suppression…' : 'Supprimer définitivement mon compte'}
          </button>
        </div>
      </form>
    </div>
  );
}
