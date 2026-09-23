import type { Metadata } from 'next';
import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { PAGES } from '@/lib/content/pages';
import { pageMetadata } from '@/lib/seo';
import { BRAND } from '@/lib/site';

const page = PAGES.safety;
export const metadata: Metadata = pageMetadata(page);

const MEASURES = [
  {
    id: 'discretion',
    title: 'Discrétion : aucun profil n’est public',
    items: [
      'Les profils, la découverte, la messagerie et les paramètres ne sont accessibles qu’aux membres connectés.',
      'Ces pages sont exclues des moteurs de recherche (balise noindex, en-tête X-Robots-Tag et robots.txt) : un profil ne peut pas apparaître dans Google.',
      'Les femmes trans peuvent rendre leurs photos visibles uniquement après un match.',
      'Votre e-mail et votre date de naissance exacte ne sont jamais affichés.',
    ],
  },
  {
    id: 'moderation',
    title: 'Signalement, blocage et modération humaine',
    items: [
      'Un bouton « Signaler » sur chaque profil et chaque conversation.',
      'Le signalement bloque immédiatement la personne : elle ne peut plus vous voir ni vous écrire.',
      'Une équipe de modération humaine examine chaque signalement ; les cas impliquant une personne mineure ou des signalements multiples sont prioritaires.',
      'Sanctions possibles : avertissement, suspension, exclusion définitive.',
    ],
  },
  {
    id: 'tolerance-zero',
    title: 'Tolérance zéro',
    items: [
      'Transphobie : nier l’identité d’une personne, la mégenrer volontairement, tenir des propos dégradants.',
      'Outing : révéler ou menacer de révéler la transidentité, l’ancien prénom ou la présence d’une personne sur le site.',
      'Prostitution et contreparties : toute proposition de rapport contre de l’argent ou un avantage.',
      'Harcèlement, arnaques, faux profils et toute présence de personne mineure.',
    ],
  },
  {
    id: 'donnees',
    title: 'Protection des données (RGPD)',
    items: [
      'Données hébergées dans l’Union européenne, aucune revente, aucune publicité ciblée.',
      'Mots de passe chiffrés (bcrypt), connexions chiffrées (HTTPS).',
      'Export de vos données et suppression définitive du compte en un clic depuis les paramètres.',
      'Adresses IP de connexion conservées un an au maximum, puis supprimées automatiquement.',
    ],
  },
];

export default function SafetyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <PageIntro
        crumbs={[{ name: page.label, path: page.path }]}
        title={`Sécurité et confidentialité sur ${BRAND}`}
        answer={
          <>
            {BRAND} protège ses membres de trois façons : les profils ne sont jamais publics ni
            indexés par les moteurs de recherche, chaque signalement bloque immédiatement la
            personne signalée avant examen par une modération humaine, et les données personnelles
            sont hébergées dans l’Union européenne sans revente ni publicité ciblée.
          </>
        }
        updated={page.updated}
      />

      {MEASURES.map((m) => (
        <section key={m.id} aria-labelledby={m.id} className="mt-10">
          <h2 id={m.id} className="text-2xl font-bold text-gray-900">
            {m.title}
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">
            {m.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      <section aria-labelledby="urgence" className="mt-10 rounded-2xl border-l-4 border-coeur-600 bg-white p-5 shadow-sm">
        <h2 id="urgence" className="text-xl font-bold text-gray-900">
          En cas de danger
        </h2>
        <p className="mt-2 text-gray-700">
          En France, appelez le <strong>17</strong> (police) ou le <strong>112</strong> (numéro
          d’urgence européen). Signalez ensuite le profil pour protéger les autres membres.
        </p>
      </section>

      <p className="mt-10 text-gray-700">
        Pour aller plus loin : notre guide{' '}
        <Link href="/guides/premier-rendez-vous-securite" className="font-medium text-coeur-700 underline">
          Premier rendez-vous : 10 conseils de sécurité
        </Link>
        , la{' '}
        <Link href={PAGES.charter.path} className="font-medium text-coeur-700 underline">
          charte de la communauté
        </Link>{' '}
        et la{' '}
        <Link href={PAGES.privacy.path} className="font-medium text-coeur-700 underline">
          politique de confidentialité
        </Link>
        .
      </p>
    </article>
  );
}
