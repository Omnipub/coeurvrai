import Link from 'next/link';
import { LEGAL_VERSION_LABEL } from '@/lib/legal';
import { LegalNav } from './LegalNav';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold text-coeur-600">
            coeur-vrai
          </Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Retour au site
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <LegalNav />
        <article className="legal rounded-2xl bg-white p-5 shadow-sm sm:p-8">
          {children}
          <p className="mt-10 border-t pt-4 text-sm text-gray-500">
            Dernière mise à jour : {LEGAL_VERSION_LABEL}
          </p>
        </article>
      </div>
    </div>
  );
}
