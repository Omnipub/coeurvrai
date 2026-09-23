import { SiteHeader } from '@/components/SiteHeader';

/** Pages publiques indexables : rendu statique (SSG), sans contenu chargé côté client. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="flex flex-1 flex-col">
        {children}
      </main>
    </>
  );
}
