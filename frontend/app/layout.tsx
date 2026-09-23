import type { Metadata } from 'next';
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
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
