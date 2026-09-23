'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { BRAND } from '@/lib/site';

const LINKS = [
  { href: '/discover', label: 'Découvrir' },
  { href: '/matches', label: 'Matchs' },
  { href: '/settings', label: 'Paramètres' },
];

export function NavBar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <nav aria-label="Espace membre">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/discover" className="text-lg font-bold text-coeur-600">
          {BRAND}
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname.startsWith(l.href) ? 'font-semibold text-coeur-600' : 'text-gray-600'}
            >
              {l.label}
            </Link>
          ))}
          <button onClick={logout} className="text-gray-500 hover:text-gray-800">
            Déconnexion
          </button>
        </div>
      </div>
      </nav>
    </header>
  );
}
