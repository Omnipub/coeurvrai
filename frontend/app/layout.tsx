import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { AuthProvider } from '@/hooks/useAuth';
import './globals.css';

export const metadata: Metadata = {
  title: 'coeur-vrai — Rencontres sincères',
  description:
    'Le site de rencontre bienveillant entre hommes et femmes trans. Respect, sécurité et vraies connexions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
