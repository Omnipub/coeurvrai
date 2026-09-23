import { LEGAL_VERSION, LEGAL_VERSION_LABEL } from '@/lib/legal';
import { LegalNav } from './LegalNav';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <LegalNav />
      <article className="legal rounded-2xl bg-white p-5 shadow-sm sm:p-8">
        {children}
        <p className="mt-10 border-t pt-4 text-sm text-gray-600">
          Dernière mise à jour : <time dateTime={LEGAL_VERSION}>{LEGAL_VERSION_LABEL}</time>
        </p>
      </article>
    </div>
  );
}
