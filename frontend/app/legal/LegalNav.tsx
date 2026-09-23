'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LEGAL_PAGES } from '@/lib/legal';

export function LegalNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Documents légaux" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-2 whitespace-nowrap">
        {LEGAL_PAGES.map((page) => {
          const active = pathname === page.href;
          return (
            <li key={page.href}>
              <Link
                href={page.href}
                aria-current={active ? 'page' : undefined}
                className={`block rounded-full px-4 py-2 text-sm font-medium transition ${
                  active ? 'bg-coeur-500 text-white' : 'bg-white text-gray-700 hover:bg-coeur-100'
                }`}
              >
                <span className="sm:hidden">{page.short}</span>
                <span className="hidden sm:inline">{page.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
