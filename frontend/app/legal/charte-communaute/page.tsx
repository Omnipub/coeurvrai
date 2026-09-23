import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Charte de la communauté — coeur-vrai',
  description:
    'Nos valeurs et nos règles de respect pour des rencontres sincères entre hommes et femmes trans.',
};

export default function CharterPage() {
  return (
    <>
      <h1>Charte de la communauté</h1>
      <p className="lead">
        Cette charte fait partie des{' '}
        <Link href="/legal/cgu">Conditions générales d’utilisation</Link>. Chaque membre
        s’engage à la respecter en créant son compte.
      </p>

      <h2 id="pourquoi">Pourquoi coeur-vrai existe</h2>
      <p>
        Beaucoup de femmes trans rencontrent sur les applications généralistes du
        harcèlement, des propos transphobes, des demandes intrusives ou des hommes qui cherchent
        une aventure cachée plutôt qu’une vraie relation. Beaucoup d’hommes attirés par les
        femmes trans n’osent pas le dire ou ne savent pas où faire des rencontres
        respectueuses.
      </p>
      <p>
        {LEGAL.siteName} a été créé pour offrir un lieu <strong>sûr</strong>,{' '}
        <strong>discret</strong> et <strong>bienveillant</strong>, où chacun·e peut chercher une
        relation sincère — amitié, rencontre ou histoire d’amour — sans avoir à se justifier ni
        à se cacher.
      </p>
      <div className="callout">
        <p className="mb-0">
          Nos trois valeurs : <strong>respect</strong> de chaque personne et de son identité,{' '}
          <strong>sincérité</strong> dans les intentions, <strong>sécurité</strong> de tous et
          toutes, en ligne comme hors ligne.
        </p>
      </div>

      <h2 id="tous">Ce que nous attendons de chaque membre</h2>
      <ul>
        <li>
          <strong>Être soi-même</strong> : un seul compte, de vraies photos récentes, un âge
          exact, des intentions honnêtes.
        </li>
        <li>
          <strong>Respecter le consentement</strong> : un « non », une absence de réponse ou un
          blocage se respectent, sans insister ni chercher à recontacter la personne ailleurs.
        </li>
        <li>
          <strong>Protéger la vie privée des autres</strong> : ce qui est partagé sur coeur-vrai
          reste sur coeur-vrai. Pas de captures d’écran, pas de recherches sur l’identité réelle
          de quelqu’un.
        </li>
        <li>
          <strong>Rester courtois·e</strong> : pas d’insultes, de moqueries ni de pression, même
          en cas de désaccord ou de déception.
        </li>
        <li>
          <strong>Signaler plutôt que répondre</strong> : face à un comportement inacceptable,
          utilisez le bouton « Signaler ». Vous êtes immédiatement protégé·e par un blocage et
          notre équipe prend le relais.
        </li>
      </ul>

      <h2 id="hommes">Pour les hommes</h2>
      <ul>
        <li>
          <strong>Une femme trans est une femme.</strong> Respectez son prénom, ses pronoms et
          son identité, en toutes circonstances.
        </li>
        <li>
          <strong>Pas de questions intrusives</strong> sur son corps, ses opérations, ses
          traitements ou son parcours de transition. Si elle souhaite en parler, elle le fera
          d’elle-même, quand elle le voudra.
        </li>
        <li>
          <strong>Ne la réduisez pas à un fantasme.</strong> Les messages centrés sur le sexe
          ou sur son corps dès le premier échange, les termes fétichisants ou dégradants et les
          photos sexuelles non sollicitées sont interdits.
        </li>
        <li>
          <strong>Soyez clair sur vos intentions.</strong> Si vous cherchez une relation
          discrète, dites-le honnêtement ; ne lui demandez jamais de se cacher ou d’avoir honte
          d’elle-même.
        </li>
        <li>
          <strong>Aucune contrepartie.</strong> Ne proposez jamais d’argent, de cadeau ou
          d’avantage en échange d’une rencontre ou d’un rapport.
        </li>
      </ul>

      <h2 id="femmes-trans">Pour les femmes trans</h2>
      <ul>
        <li>
          <strong>Soyez sincère sur vos attentes</strong> : amitié, relation sérieuse ou
          rencontre, le dire dès le départ évite les malentendus.
        </li>
        <li>
          <strong>Respectez la discrétion des hommes</strong> : certains ne sont pas encore
          prêts à en parler autour d’eux. Ne révélez jamais leur présence sur le site.
        </li>
        <li>
          <strong>Pas d’activité commerciale</strong> : les annonces tarifées, les profils
          d’escorte et les renvois vers des plateformes payantes sont interdits.
        </li>
        <li>
          <strong>Vous décidez de ce que vous partagez</strong> : utilisez l’option « photos
          visibles après un match » si vous le souhaitez, et ne partagez votre numéro ou vos
          réseaux qu’en confiance.
        </li>
      </ul>

      <h2 id="tolerance-zero">Tolérance zéro</h2>
      <p>
        Les comportements suivants entraînent la suspension immédiate du compte puis son
        exclusion définitive, sans avertissement préalable. Les faits les plus graves sont
        signalés aux autorités.
      </p>

      <h3>🚫 Prostitution et contreparties</h3>
      <ul>
        <li>proposer, demander ou négocier un rapport sexuel contre de l’argent ou un avantage ;</li>
        <li>« sugar dating », tarifs, « cadeaux » en échange de rencontres ;</li>
        <li>profils d’escorte, liens vers des annonces ou plateformes payantes ;</li>
        <li>toute forme de proxénétisme ou d’exploitation d’une autre personne.</li>
      </ul>

      <h3>🚫 Outing et atteintes à la vie privée</h3>
      <ul>
        <li>
          révéler ou menacer de révéler qu’une personne est trans, qu’elle fréquente des
          femmes trans ou qu’elle est inscrite sur coeur-vrai ;
        </li>
        <li>divulguer un ancien prénom, une identité civile, une adresse ou un lieu de travail ;</li>
        <li>faire circuler des captures d’écran de profils ou de conversations ;</li>
        <li>
          chantage, « sextorsion », menace de diffuser des photos ou des messages, diffusion
          d’images intimes.
        </li>
      </ul>

      <h3>🚫 Transphobie et discriminations</h3>
      <ul>
        <li>
          nier l’identité d’une femme trans (« tu es un homme », « un vrai homme / une vraie
          femme ») ;
        </li>
        <li>mégenrer volontairement ou utiliser un ancien prénom ;</li>
        <li>propos dégradants ou moqueurs sur les corps, les transitions ou les personnes trans ;</li>
        <li>
          insultes transphobes, homophobes, racistes, sexistes, validistes, ou incitation à la
          haine ;
        </li>
        <li>
          mépris envers les hommes qui fréquentent des femmes trans (moqueries sur leur
          orientation, menaces de les exposer).
        </li>
      </ul>

      <h3>🚫 Autres interdits</h3>
      <ul>
        <li>toute présence ou tout contenu impliquant une personne mineure ;</li>
        <li>harcèlement, menaces, insistance après un refus ou un blocage ;</li>
        <li>arnaques sentimentales, demandes d’argent, liens frauduleux ;</li>
        <li>faux profils, usurpation d’identité, photos qui ne sont pas les vôtres.</li>
      </ul>

      <h2 id="moderation">Comment nous faisons respecter la charte</h2>
      <ol>
        <li>
          Vous cliquez sur <strong>« Signaler »</strong> depuis une conversation ou un profil.
        </li>
        <li>
          La personne est <strong>bloquée immédiatement</strong> : elle ne peut plus voir votre
          profil ni vous écrire.
        </li>
        <li>
          Un·e modérateur·rice examine le signalement. Les cas les plus graves (personne
          mineure, signalements multiples) sont traités en priorité.
        </li>
        <li>
          Une décision est prise : classement, avertissement, suspension ou exclusion
          définitive. La personne sanctionnée peut contester la décision.
        </li>
      </ol>
      <p>
        Les signalements abusifs ou mensongers utilisés pour nuire à un·e membre sont eux-mêmes
        sanctionnés.
      </p>

      <h2 id="securite">Conseils de sécurité pour vos rencontres</h2>
      <ul>
        <li>Faites connaissance sur coeur-vrai avant de partager votre numéro ou vos réseaux.</li>
        <li>Pour un premier rendez-vous, choisissez un lieu public et prévenez un·e proche.</li>
        <li>Gardez vos propres moyens de transport pour pouvoir partir quand vous le souhaitez.</li>
        <li>N’envoyez jamais d’argent à quelqu’un que vous n’avez pas rencontré.</li>
        <li>Faites confiance à votre instinct : en cas de doute, bloquez et signalez.</li>
      </ul>
      <p>
        En cas de danger immédiat, appelez le <strong>17</strong> (police) ou le{' '}
        <strong>112</strong>. Pour une écoute ou un accompagnement suite à une agression ou une
        discrimination liée à l’identité de genre, vous pouvez contacter{' '}
        <a href="https://www.sos-homophobie.org" target="_blank" rel="noopener noreferrer">
          SOS Homophobie
        </a>{' '}
        ou l’association de votre choix.
      </p>
      <p>
        Une question sur cette charte ? Écrivez-nous à{' '}
        <a href={`mailto:${LEGAL.moderationEmail}`}>{LEGAL.moderationEmail}</a>.
      </p>
    </>
  );
}
