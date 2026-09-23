import Link from 'next/link';
import { LEGAL, LEGAL_PAGES } from '@/lib/legal';

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Liens légaux">
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {LEGAL_PAGES.map((page) => (
              <li key={page.href}>
                <Link href={page.href} className="hover:text-coeur-600 hover:underline">
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="shrink-0 whitespace-nowrap text-gray-400">
          © {new Date().getFullYear()} {LEGAL.siteName}
        </p>
      </div>
    </footer>
  );
}
