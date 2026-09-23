import type { Metadata } from 'next';
import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { UpdatedDate } from '@/components/UpdatedDate';
import { GUIDES } from '@/lib/content/guides';
import { PAGES } from '@/lib/content/pages';
import { pageMetadata } from '@/lib/seo';
import { BRAND } from '@/lib/site';

const page = PAGES.guides;
export const metadata: Metadata = pageMetadata(page);

export default function GuidesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <PageIntro
        crumbs={[{ name: page.label, path: page.path }]}
        title={`Les guides ${BRAND}`}
        answer={
          <>
            Les guides {BRAND} donnent des conseils pratiques et vérifiés pour des rencontres
            respectueuses et sûres entre hommes et femmes trans : préparer un premier rendez-vous,
            aborder une femme trans avec respect et protéger sa vie privée en ligne.
          </>
        }
        updated={page.updated}
      />

      <section aria-labelledby="liste-guides">
        <h2 id="liste-guides" className="sr-only">
          Tous les guides
        </h2>
        <ul className="space-y-5">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <article className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900">
                  <Link href={`/guides/${g.slug}`} className="hover:text-coeur-700 hover:underline">
                    {g.headline}
                  </Link>
                </h3>
                <p className="mt-2 text-gray-700">{g.description}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 text-sm text-gray-600">
                  <UpdatedDate date={g.updated} />
                  <span>{g.readingMinutes} min de lecture</span>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
