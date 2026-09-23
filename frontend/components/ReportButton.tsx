'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { REPORT_REASONS, ReportReason } from '@/types';

interface Props {
  reportedId: string;
  onDone?: () => void;
}

/** Signaler un membre : le bloque aussi immédiatement côté serveur. */
export function ReportButton({ reportedId, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('harcelement');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ reportedId, reason, details: details || null }),
      });
      setOpen(false);
      onDone?.();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-gray-500 underline">
        Signaler
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border bg-white p-3 text-sm">
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as ReportReason)}
        className="w-full rounded border p-2"
      >
        {Object.entries(REPORT_REASONS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={2000}
        placeholder="Détails (facultatif)"
        className="w-full rounded border p-2"
      />
      {error && <p className="text-red-600">{error}</p>}
      <p className="text-xs text-gray-500">La personne sera bloquée et notre équipe examinera le signalement.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded border px-3 py-1">
          Annuler
        </button>
        <button type="submit" className="rounded bg-coeur-500 px-3 py-1 text-white">
          Envoyer
        </button>
      </div>
    </form>
  );
}
