import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Footer } from '@/components/Footer';
import { AuthProvider } from '@/hooks/useAuth';
import { BRAND, SITE_DESCRIPTION, SITE_URL } from '@/lib/site';
import './globals.css';

/** Police auto-hébergée (aucune requête vers un service tiers, pas de rendu bloquant). */
const inter = localFont({
  src: './fonts/Inter-latin-var.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-inter',
});

/**
 * Par défaut, AUCUNE page n'est indexable : seules les pages publiques
 * (groupe (public), via buildMetadata) activent explicitement l'indexation.
 * Une page privée oubliée reste donc protégée.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: BRAND, template: `%s | ${BRAND}` },
  description: SITE_DESCRIPTION,
  applicationName: BRAND,
  robots: { index: false, follow: false },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: '#be123c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="flex min-h-screen flex-col font-sans">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-coeur-700 focus:shadow-lg"
        >
          Aller au contenu
        </a>
        <AuthProvider>
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
