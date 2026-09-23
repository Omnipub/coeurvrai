import Link from 'next/link';
import { PAGES } from '@/lib/content/pages';
import { BRAND } from '@/lib/site';

const NAV = [PAGES.howItWorks, PAGES.safety, PAGES.faq, PAGES.guides];

/** En-tête des pages publiques (rendu serveur, aucune dépendance à la session). */
export function SiteHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-coeur-700">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-coeur-600">
            <path d="M12 20s-6.8-4.2-8.7-8.4C2 8.4 3.9 5 7.2 5c1.9 0 3.3 1.1 4 2.3h1.6c.7-1.2 2.1-2.3 4-2.3 3.3 0 5.2 3.4 3.8 6.6C18.8 15.8 12 20 12 20z" />
          </svg>
          {BRAND}
        </Link>
        <nav aria-label="Navigation principale" className="order-3 w-full sm:order-2 sm:w-auto">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-gray-700">
            {NAV.map((p) => (
              <li key={p.path}>
                <Link href={p.path} className="hover:text-coeur-700 hover:underline">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="order-2 flex items-center gap-3 text-sm sm:order-3">
          <Link href="/login" className="font-medium text-gray-700 hover:text-coeur-700">
            Connexion
          </Link>
          <Link href="/signup" className="rounded-full bg-coeur-600 px-4 py-2 font-medium text-white hover:bg-coeur-700">
            S’inscrire
          </Link>
        </div>
      </div>
    </header>
  );
}
