import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';

/** Espace membre : jamais indexable (profils, découverte, chat, paramètres). */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
