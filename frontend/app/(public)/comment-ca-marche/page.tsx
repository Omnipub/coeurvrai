import type { Metadata } from 'next';
import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { PAGES } from '@/lib/content/pages';
import { pageMetadata } from '@/lib/seo';
import { BRAND } from '@/lib/site';

const page = PAGES.howItWorks;
export const metadata: Metadata = pageMetadata(page);

const STEPS = [
  {
    title: 'Créez votre compte gratuitement',
    text: 'Indiquez si vous êtes un homme ou une femme trans, votre prénom ou pseudo, votre date de naissance et votre e-mail. L’inscription est réservée aux 18 ans et plus et nécessite d’accepter les CGU et la charte de la communauté.',
  },
  {
    title: 'Confirmez votre e-mail et complétez votre profil',
    text: 'Un lien valable 24 heures vous est envoyé. Ajoutez ensuite une biographie, votre ville et jusqu’à six photos. Les femmes trans peuvent réserver leurs photos à leurs matchs.',
  },
  {
    title: 'Découvrez les profils et aimez ceux qui vous plaisent',
    text: 'Les hommes voient des profils de femmes trans, et les femmes trans des profils d’hommes. Un like reste discret : la personne ne le voit que si elle vous aime aussi.',
  },
  {
    title: 'Matchez, puis discutez en privé',
    text: 'Quand deux personnes s’aiment mutuellement, c’est un match et la messagerie s’ouvre. Vous pouvez mettre fin à un match, bloquer ou signaler à tout moment.',
  },
];

export default function HowItWorksPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <PageIntro
        crumbs={[{ name: page.label, path: page.path }]}
        title={`Comment fonctionne ${BRAND} ?`}
        answer={
          <>
            {BRAND} fonctionne en 4 étapes : vous créez gratuitement un compte (18 ans et plus),
            vous confirmez votre e-mail, vous aimez les profils compatibles qui vous plaisent, puis
            vous discutez en privé avec les personnes qui vous ont aimé·e en retour. Aucun paiement
            n’est nécessaire pour utiliser ces fonctionnalités.
          </>
        }
      />

      <section aria-labelledby="etapes">
        <h2 id="etapes" className="text-2xl font-bold text-gray-900">
          Les 4 étapes
        </h2>
        <ol className="mt-6 space-y-5">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-coeur-600 font-bold text-white" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-1 text-gray-700">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="badge" className="mt-12">
        <h2 id="badge" className="text-2xl font-bold text-gray-900">
          Le badge « Profil vérifié »
        </h2>
        <p className="mt-3 text-gray-700">
          Facultatif, il s’obtient en confirmant son e-mail et en réussissant une vérification par
          selfie vidéo d’environ une minute, réalisée par notre prestataire Onfido. Il atteste
          qu’une personne réelle se trouve derrière le profil. {BRAND} ne conserve que le
          résultat, jamais la vidéo.
        </p>
      </section>

      <section aria-labelledby="prix" className="mt-12">
        <h2 id="prix" className="text-2xl font-bold text-gray-900">
          Combien ça coûte ?
        </h2>
        <p className="mt-3 text-gray-700">
          L’inscription, les likes, les matchs, la messagerie, le blocage et le signalement sont
          gratuits. Un abonnement Premium facultatif pourra proposer des fonctionnalités
          supplémentaires ; son prix sera toujours affiché avant souscription et il sera résiliable
          à tout moment.
        </p>
      </section>

      <p className="mt-12 flex flex-col gap-3 sm:flex-row">
        <Link href="/signup" className="rounded-full bg-coeur-600 px-6 py-3 text-center font-medium text-white hover:bg-coeur-700">
          Créer un compte gratuit
        </Link>
        <Link href={PAGES.faq.path} className="rounded-full border border-coeur-600 px-6 py-3 text-center font-medium text-coeur-700">
          Consulter la FAQ
        </Link>
      </p>
    </article>
  );
}
