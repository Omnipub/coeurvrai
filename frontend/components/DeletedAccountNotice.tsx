'use client';

import { useSearchParams } from 'next/navigation';
import { BRAND } from '@/lib/site';

/** Confirmation après suppression de compte (/?compte=supprime), sans rendre l'accueil dynamique. */
export function DeletedAccountNotice() {
  if (useSearchParams().get('compte') !== 'supprime') return null;
  return (
    <p role="status" className="mx-auto mt-6 max-w-xl rounded-xl bg-white px-4 py-3 text-center text-sm text-gray-700 shadow-sm">
      Votre compte et vos données ont été supprimés. Merci d’avoir fait partie de {BRAND}.
    </p>
  );
}
