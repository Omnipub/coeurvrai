'use client';

import { useState } from 'react';
import { downloadFile } from '@/lib/api';

/** Télécharge l'export RGPD complet du compte (JSON). */
export function ExportDataButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onClick() {
    setPending(true);
    setError(null);
    try {
      await downloadFile('/api/account/export', 'coeurvrai-export.json');
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={pending}
        className="rounded-full bg-coeur-500 px-5 py-2 font-medium text-white hover:bg-coeur-600 disabled:opacity-50"
      >
        {pending ? 'Préparation…' : 'Télécharger mes données (JSON)'}
      </button>
      {done && <p className="text-sm text-green-700">Export téléchargé.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
