import type { Metadata } from 'next';
import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { PAGES } from '@/lib/content/pages';
import { pageMetadata } from '@/lib/seo';
import { BRAND, CONTACT_EMAIL } from '@/lib/site';

const page = PAGES.about;
export const metadata: Metadata = pageMetadata(page);

export default function AboutPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <PageIntro
        crumbs={[{ name: page.label, path: page.path }]}
        title={`À propos de ${BRAND}`}
        answer={
          <>
            {BRAND} est un site de rencontre francophone créé pour offrir aux femmes trans et aux
            hommes qui les aiment un lieu sûr, discret et respectueux, où chercher une relation
            sincère sans avoir à se justifier ni à se cacher.
          </>
        }
      />

      <section aria-labelledby="pourquoi">
        <h2 id="pourquoi" className="text-2xl font-bold text-gray-900">
          Pourquoi {BRAND} existe
        </h2>
        <p className="mt-3 text-gray-700">
          Sur les applications généralistes, beaucoup de femmes trans subissent du harcèlement,
          des propos transphobes et des demandes intrusives. Beaucoup d’hommes attirés par les
          femmes trans n’osent pas le dire, ou ne savent pas où faire des rencontres
          respectueuses. {BRAND} répond à ces deux besoins avec un espace dédié, modéré et
          discret.
        </p>
      </section>

      <section aria-labelledby="valeurs" className="mt-10">
        <h2 id="valeurs" className="text-2xl font-bold text-gray-900">
          Nos valeurs
        </h2>
        <dl className="mt-4 space-y-4">
          <div>
            <dt className="font-semibold text-gray-900">Respect</dt>
            <dd className="text-gray-700">Chaque personne et son identité sont respectées, sans exception.</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-900">Sincérité</dt>
            <dd className="text-gray-700">Des intentions honnêtes, sans contrepartie ni faux-semblant.</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-900">Sécurité</dt>
            <dd className="text-gray-700">
              Une modération humaine, une vie privée protégée par défaut et des outils de
              signalement efficaces.
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="engagements" className="mt-10">
        <h2 id="engagements" className="text-2xl font-bold text-gray-900">
          Nos engagements
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">
          <li>Aucune revente de données et aucune publicité ciblée.</li>
          <li>Aucun profil visible sur les moteurs de recherche.</li>
          <li>Des fonctionnalités essentielles gratuites.</li>
          <li>
            Des règles claires, écrites dans la{' '}
            <Link href={PAGES.charter.path} className="font-medium text-coeur-700 underline">
              charte de la communauté
            </Link>
            .
          </li>
        </ul>
      </section>

      <section aria-labelledby="contact" className="mt-10">
        <h2 id="contact" className="text-2xl font-bold text-gray-900">
          Nous contacter
        </h2>
        <p className="mt-3 text-gray-700">
          Une question, une suggestion ou un partenariat associatif ? Écrivez-nous à{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-coeur-700 underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </article>
  );
}
