import Link from 'next/link';
import { PAGES } from '@/lib/content/pages';
import { BRAND } from '@/lib/site';

const COLUMNS = [
  { title: BRAND, links: [PAGES.howItWorks, PAGES.safety, PAGES.about] },
  { title: 'Ressources', links: [PAGES.faq, PAGES.guides] },
  { title: 'Informations légales', links: [PAGES.cgu, PAGES.privacy, PAGES.charter] },
];

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 text-sm text-gray-700 sm:grid-cols-3">
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="mb-2 font-semibold text-gray-900">{col.title}</p>
            <ul className="space-y-1.5">
              {col.links.map((page) => (
                <li key={page.path}>
                  <Link href={page.path} className="hover:text-coeur-700 hover:underline">
                    {page.path.startsWith('/legal') ? page.title : page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="border-t px-4 py-4 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} {BRAND} · Rencontres entre hommes et femmes trans · 18 ans et plus
      </p>
    </footer>
  );
}
