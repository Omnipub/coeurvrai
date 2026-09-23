import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { DeletedAccountNotice } from '@/components/DeletedAccountNotice';
import { JsonLd } from '@/components/JsonLd';
import { FAQ_ITEMS } from '@/lib/content/faq';
import { GUIDES } from '@/lib/content/guides';
import { PAGES } from '@/lib/content/pages';
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld';
import { pageMetadata } from '@/lib/seo';
import { BRAND } from '@/lib/site';

export const metadata: Metadata = pageMetadata(PAGES.home);

const PROMISES = [
  {
    title: 'Discrétion',
    text: 'Profils réservés aux membres connectés et jamais indexés par les moteurs de recherche. Photos visibles uniquement après un match, si vous le souhaitez.',
  },
  {
    title: 'Sécurité',
    text: 'Signalement en un clic qui bloque immédiatement la personne, modération humaine et tolérance zéro contre la transphobie, l’outing et la prostitution.',
  },
  {
    title: 'Confiance',
    text: 'Badge « Profil vérifié » pour les membres qui ont confirmé leur e-mail et réussi une vérification par selfie vidéo.',
  },
];

const STEPS = [
  'Créez gratuitement votre compte (18 ans et plus).',
  'Découvrez des profils compatibles et aimez ceux qui vous plaisent.',
  'En cas de like réciproque, c’est un match : discutez en privé.',
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <Suspense fallback={null}>
        <DeletedAccountNotice />
      </Suspense>

      <section aria-labelledby="titre-accueil" className="bg-gradient-to-b from-white to-coeur-50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:py-20">
          <h1 id="titre-accueil" className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {BRAND}, le site de rencontre entre hommes et femmes trans
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-700">
            <strong>{BRAND}</strong> est un site de rencontre sérieux et bienveillant qui met en
            relation des <strong>hommes</strong> et des <strong>femmes trans</strong> majeurs, en
            France et dans toute la francophonie. L’inscription et les fonctionnalités essentielles
            sont <strong>gratuites</strong> ; les profils sont modérés par des humains et ne sont
            jamais visibles par les moteurs de recherche.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="rounded-full bg-coeur-600 px-6 py-3 font-medium text-white hover:bg-coeur-700">
              Créer un compte gratuit
            </Link>
            <Link href={PAGES.howItWorks.path} className="rounded-full border border-coeur-600 bg-white px-6 py-3 font-medium text-coeur-700 hover:bg-coeur-50">
              Comment ça marche
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl space-y-16 px-4 py-16">
        <section aria-labelledby="promesses">
          <h2 id="promesses" className="text-center text-2xl font-bold text-gray-900">
            Pourquoi choisir {BRAND} ?
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-3">
            {PROMISES.map((p) => (
              <li key={p.title} className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-coeur-700">{p.title}</h3>
                <p className="mt-2 text-gray-700">{p.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center">
            <Link href={PAGES.safety.path} className="font-medium text-coeur-700 underline">
              Tout savoir sur la sécurité et la confidentialité
            </Link>
          </p>
        </section>

        <section aria-labelledby="etapes">
          <h2 id="etapes" className="text-center text-2xl font-bold text-gray-900">
            Comment ça marche, en 3 étapes
          </h2>
          <ol className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step} className="rounded-2xl bg-white p-6 shadow-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coeur-600 font-bold text-white" aria-hidden="true">
                  {i + 1}
                </span>
                <p className="mt-3 text-gray-700">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="questions" className="mx-auto max-w-3xl">
          <h2 id="questions" className="text-2xl font-bold text-gray-900">
            Questions fréquentes
          </h2>
          <dl className="mt-6 space-y-5">
            {FAQ_ITEMS.slice(0, 3).map((item) => (
              <div key={item.question}>
                <dt className="font-semibold text-gray-900">{item.question}</dt>
                <dd className="mt-1 text-gray-700">{item.answer}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6">
            <Link href={PAGES.faq.path} className="font-medium text-coeur-700 underline">
              Voir toutes les questions
            </Link>
          </p>
        </section>

        <section aria-labelledby="guides" className="mx-auto max-w-3xl">
          <h2 id="guides" className="text-2xl font-bold text-gray-900">
            Nos guides
          </h2>
          <ul className="mt-6 space-y-3">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="font-medium text-coeur-700 underline">
                  {g.headline}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
