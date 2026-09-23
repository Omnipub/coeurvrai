import type { Metadata } from 'next';
import Link from 'next/link';
import { BRAND } from '@/lib/site';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="contenu" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-8">
      <Link href="/" className="text-center text-3xl font-bold text-coeur-600">
        {BRAND}
      </Link>
      <div className="rounded-2xl bg-white p-6 shadow-md">{children}</div>
    </main>
  );
}
