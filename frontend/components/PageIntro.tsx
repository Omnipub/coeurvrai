import type { Crumb } from '@/lib/jsonld';
import { Breadcrumbs } from './Breadcrumbs';
import { UpdatedDate } from './UpdatedDate';

interface Props {
  crumbs: Crumb[];
  title: string;
  /** Paragraphe d'ouverture : réponse directe à la question principale de la page. */
  answer: React.ReactNode;
  updated?: string;
}

/** En-tête standard d'une page publique : fil d'Ariane, h1 unique, réponse directe. */
export function PageIntro({ crumbs, title, answer, updated }: Props) {
  return (
    <header className="mb-8">
      <Breadcrumbs items={crumbs} />
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-gray-700">{answer}</p>
      {updated && (
        <div className="mt-3">
          <UpdatedDate date={updated} />
        </div>
      )}
    </header>
  );
}
