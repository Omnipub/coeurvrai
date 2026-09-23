import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { UpdatedDate } from '@/components/UpdatedDate';
import { GUIDES, getGuide } from '@/lib/content/guides';
import { PAGES } from '@/lib/content/pages';
import { articleJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { BRAND } from '@/lib/site';

/** Tous les guides sont générés au build (SSG) ; un slug inconnu renvoie une 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const guide = getGuide(params.slug);
  if (!guide) return {};
  return buildMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${guide.slug}`,
    ogKey: `guide-${guide.slug}`,
    type: 'article',
    publishedTime: guide.published,
    modifiedTime: guide.updated,
  });
}

export default function GuidePage({ params }: { params: { slug: string } }) {
  const guide = getGuide(params.slug);
  if (!guide) notFound();

  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <JsonLd data={articleJsonLd(guide)} />
      <article>
        <header className="mb-8">
          <Breadcrumbs
            items={[
              { name: PAGES.guides.label, path: PAGES.guides.path },
              { name: guide.title, path: `/guides/${guide.slug}` },
            ]}
          />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{guide.headline}</h1>
          <p className="mt-5 rounded-2xl border-l-4 border-coeur-600 bg-white p-5 text-lg leading-relaxed text-gray-800 shadow-sm">
            {guide.summary}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 text-sm text-gray-600">
            <UpdatedDate date={guide.updated} />
            <span>
              Publié le{' '}
              <time dateTime={guide.published}>
                {new Date(`${guide.published}T12:00:00Z`).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            </span>
            <span>{guide.readingMinutes} min de lecture</span>
            <span>Par l’équipe {BRAND}</span>
          </div>
        </header>

        {guide.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900">{section.heading}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="mt-3 leading-relaxed text-gray-700">
                {p}
              </p>
            ))}
            {section.list && (
              <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-700">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>

      <aside aria-labelledby="autres-guides" className="mt-12 border-t pt-8">
        <h2 id="autres-guides" className="text-xl font-bold text-gray-900">
          À lire aussi
        </h2>
        <ul className="mt-4 space-y-2">
          {others.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="font-medium text-coeur-700 underline">
                {g.headline}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
