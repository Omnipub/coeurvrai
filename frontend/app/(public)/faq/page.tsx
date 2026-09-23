import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { PageIntro } from '@/components/PageIntro';
import { FAQ, FAQ_ITEMS, FAQ_UPDATED } from '@/lib/content/faq';
import { PAGES } from '@/lib/content/pages';
import { faqPageJsonLd } from '@/lib/jsonld';
import { pageMetadata } from '@/lib/seo';
import { BRAND } from '@/lib/site';

const page = PAGES.faq;
export const metadata: Metadata = pageMetadata(page);

export default function FaqPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <JsonLd data={faqPageJsonLd(FAQ_ITEMS, FAQ_UPDATED)} />
      <PageIntro
        crumbs={[{ name: page.label, path: page.path }]}
        title={`Questions fréquentes sur ${BRAND}`}
        answer={
          <>
            {BRAND} est un site de rencontre gratuit réservé aux hommes et aux femmes trans de 18
            ans et plus. Les profils ne sont jamais publics, chaque signalement bloque
            immédiatement la personne signalée, et vous pouvez exporter ou supprimer vos données à
            tout moment. Les réponses détaillées sont ci-dessous.
          </>
        }
        updated={FAQ_UPDATED}
      />

      <nav aria-label="Thèmes de la FAQ" className="mb-8">
        <ul className="flex flex-wrap gap-2 text-sm">
          {FAQ.map((group) => (
            <li key={group.id}>
              <a href={`#${group.id}`} className="block rounded-full bg-white px-4 py-2 font-medium text-gray-800 shadow-sm hover:bg-coeur-100">
                {group.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {FAQ.map((group) => (
        <section key={group.id} aria-labelledby={group.id} className="mt-10 scroll-mt-6">
          <h2 id={group.id} className="text-2xl font-bold text-gray-900">
            {group.title}
          </h2>
          <div className="mt-4 space-y-4">
            {group.items.map((item) => (
              <section key={item.question} className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">{item.question}</h3>
                <p className="mt-2 text-gray-700">{item.answer}</p>
              </section>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
