import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Conditions générales d’utilisation — coeur-vrai',
  description: 'Règles d’accès et d’utilisation du service de rencontre coeur-vrai.com.',
};

export default function CguPage() {
  return (
    <>
      <h1>Conditions générales d’utilisation</h1>
      <p className="lead">
        Les présentes conditions générales d’utilisation (« CGU ») encadrent l’accès et
        l’utilisation du service {LEGAL.siteName} (le « Service »). En créant un compte, vous
        les acceptez sans réserve, ainsi que la{' '}
        <Link href="/legal/charte-communaute">Charte de la communauté</Link>, qui en fait
        partie intégrante.
      </p>

      <nav className="toc" aria-label="Sommaire">
        <ol>
          <li><a href="#editeur">Éditeur du Service</a></li>
          <li><a href="#objet">Objet du Service</a></li>
          <li><a href="#inscription">Conditions d’inscription</a></li>
          <li><a href="#compte">Compte et sécurité</a></li>
          <li><a href="#tolerance-zero">Tolérance zéro</a></li>
          <li><a href="#moderation">Modération, signalements et sanctions</a></li>
          <li><a href="#abonnement">Abonnement premium</a></li>
          <li><a href="#resiliation">Résiliation et suppression du compte</a></li>
          <li><a href="#responsabilite">Responsabilité</a></li>
          <li><a href="#donnees">Données personnelles</a></li>
          <li><a href="#modification">Modification des CGU</a></li>
          <li><a href="#droit">Droit applicable et litiges</a></li>
        </ol>
      </nav>

      <h2 id="editeur">1. Éditeur du Service</h2>
      <p>
        Le Service est édité par {LEGAL.company}, {LEGAL.legalForm}, dont le siège social est
        situé {LEGAL.address}, immatriculée sous le numéro {LEGAL.rcs}. Directeur·rice de la
        publication : {LEGAL.publicationDirector}. Contact :{' '}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
      <p>Hébergement : {LEGAL.host}.</p>

      <h2 id="objet">2. Objet du Service</h2>
      <p>
        {LEGAL.siteName} est un service de rencontre en ligne dédié aux relations sincères et
        respectueuses entre <strong>hommes</strong> et <strong>femmes trans</strong>. Il permet de
        créer un profil, de découvrir des profils compatibles, d’exprimer un intérêt
        (« like »), d’obtenir une mise en relation réciproque (« match ») et d’échanger des
        messages privés avec ses matchs.
      </p>
      <p>
        Le Service est un espace de rencontre entre particuliers, à des fins strictement
        personnelles et non commerciales.
      </p>

      <h2 id="inscription">3. Conditions d’inscription</h2>
      <ul>
        <li>
          Être <strong>âgé·e d’au moins 18 ans</strong>. Toute inscription d’une personne mineure
          entraîne la suppression immédiate du compte.
        </li>
        <li>Être une personne physique et n’ouvrir qu’un seul compte.</li>
        <li>
          Fournir des informations exactes (date de naissance, adresse e-mail) et les tenir à
          jour.
        </li>
        <li>
          Choisir le type de compte qui correspond à votre identité : « homme » ou « femme
          trans ». Ce choix détermine les profils qui vous sont proposés.
        </li>
        <li>
          Accepter les présentes CGU et la Charte de la communauté, et consentir expressément au
          traitement des données sensibles décrit dans la{' '}
          <Link href="/legal/politique-confidentialite">Politique de confidentialité</Link>.
        </li>
        <li>
          Ne pas avoir fait l’objet d’une exclusion définitive du Service.
        </li>
      </ul>

      <h2 id="compte">4. Compte et sécurité</h2>
      <p>
        Vos identifiants sont personnels et confidentiels. Vous êtes responsable de toute
        activité réalisée depuis votre compte. En cas d’utilisation frauduleuse, prévenez-nous
        sans délai à <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
      <p>
        Vous êtes seul·e responsable des contenus que vous publiez (textes, photos, messages).
        Vous garantissez détenir les droits sur les photos publiées et qu’elles vous
        représentent. Vous nous accordez une licence non exclusive, gratuite et limitée à la
        durée de vie de votre compte pour les afficher dans le cadre du Service.
      </p>

      <h3>Badge « Profil vérifié »</h3>
      <p>
        Le badge indique que le ou la membre a confirmé son adresse e-mail et réussi une
        vérification par selfie auprès de notre prestataire Onfido. Cette vérification,
        facultative, atteste qu’il s’agit d’une personne réelle ; elle ne garantit ni son
        identité civile, ni la sincérité de ses intentions. Restez vigilant·e.
      </p>

      <h2 id="tolerance-zero">5. Tolérance zéro</h2>
      <div className="callout">
        <p>
          Les comportements suivants entraînent la <strong>suspension immédiate</strong> du
          compte, puis son <strong>exclusion définitive</strong> après vérification, sans
          préavis ni remboursement. Ils peuvent faire l’objet d’un signalement aux autorités
          compétentes.
        </p>
      </div>

      <h3>5.1 Prostitution et contreparties</h3>
      <p>
        Il est interdit de proposer, solliciter ou négocier un rapport ou un service sexuel en
        échange d’une rémunération ou de tout avantage (argent, cadeaux, hébergement,
        « sugar dating », cryptomonnaies…), directement ou par renvoi vers un autre site, une
        messagerie ou un réseau social. En France, l’achat d’un acte sexuel est une infraction
        (article 611-1 du Code pénal) et le proxénétisme est un délit (articles 225-5 et
        suivants). Les profils d’escorte, les annonces tarifées et le racolage sont supprimés.
      </p>

      <h3>5.2 Outing et atteinte à la vie privée</h3>
      <p>
        Il est interdit de révéler ou de menacer de révéler, sans son accord, l’identité de
        genre, le parcours de transition, l’orientation sexuelle, la présence sur le Service,
        l’identité civile, l’ancien prénom, l’adresse ou le lieu de travail d’un·e membre. Il
        est également interdit de faire des captures d’écran de profils ou de conversations pour
        les diffuser, de rechercher l’identité réelle d’un·e membre ou de faire pression sur
        elle ou lui (chantage, « sextorsion »). Ces faits peuvent constituer des infractions
        pénales (atteinte à la vie privée, chantage, harcèlement).
      </p>

      <h3>5.3 Transphobie, haine et discriminations</h3>
      <p>
        Sont interdits les propos, messages ou comportements transphobes, homophobes,
        racistes, sexistes ou discriminatoires, notamment : nier l’identité de genre d’une
        personne, utiliser volontairement son ancien prénom ou un mauvais genre (mégenrage
        délibéré), tenir des propos dégradants sur les corps trans, ou inciter à la haine. Les
        injures et provocations à la haine en raison de l’identité de genre sont réprimées par
        la loi du 29 juillet 1881.
      </p>

      <h3>5.4 Autres interdits graves</h3>
      <ul>
        <li>toute présence ou contenu impliquant une personne mineure ;</li>
        <li>harcèlement, menaces, violences ou incitation à la violence ;</li>
        <li>envoi de contenus sexuels non sollicités ;</li>
        <li>diffusion d’images intimes sans consentement ;</li>
        <li>arnaques, escroqueries sentimentales, demandes d’argent, hameçonnage ;</li>
        <li>usurpation d’identité, faux profils, comptes multiples ;</li>
        <li>démarchage commercial, publicité, spam, collecte automatisée de données.</li>
      </ul>

      <h2 id="moderation">6. Modération, signalements et sanctions</h2>
      <p>
        Chaque membre peut <strong>signaler</strong> un profil ou un message depuis
        l’application. Le signalement <strong>bloque immédiatement</strong> la personne
        signalée : elle ne peut plus voir votre profil ni vous écrire. Vous pouvez aussi bloquer
        un·e membre sans le ou la signaler.
      </p>
      <p>
        Les signalements sont examinés par une équipe de modération humaine. Les signalements
        concernant une personne présumée mineure ou visant un même compte à plusieurs reprises
        sont traités en priorité. Vous pouvez aussi écrire à{' '}
        <a href={`mailto:${LEGAL.moderationEmail}`}>{LEGAL.moderationEmail}</a>.
      </p>
      <p>Selon la gravité des faits, nous pouvons :</p>
      <ul>
        <li>classer le signalement sans suite ;</li>
        <li>adresser un avertissement ;</li>
        <li>retirer un contenu ;</li>
        <li>suspendre temporairement le compte ;</li>
        <li>exclure définitivement le compte (bannissement).</li>
      </ul>
      <p>
        Toute décision de suspension ou d’exclusion est motivée. Vous pouvez la contester dans
        un délai de six mois en écrivant à{' '}
        <a href={`mailto:${LEGAL.moderationEmail}`}>{LEGAL.moderationEmail}</a> ; votre
        réclamation sera réexaminée par une autre personne que celle ayant pris la décision,
        conformément au règlement européen sur les services numériques (DSA).
      </p>

      <h2 id="abonnement">7. Abonnement premium</h2>
      <p>
        L’inscription et les fonctionnalités essentielles du Service (profil, découverte, likes,
        matchs, messagerie, signalement, blocage) sont gratuites. Des fonctionnalités
        complémentaires peuvent être proposées via un abonnement payant (« Premium »).
      </p>
      <ul>
        <li>
          <strong>Prix et durée</strong> : les formules, leur prix TTC et leur durée sont
          indiqués clairement avant toute souscription.
        </li>
        <li>
          <strong>Paiement</strong> : le paiement est traité par notre prestataire Stripe. Nous
          ne stockons jamais vos numéros de carte bancaire.
        </li>
        <li>
          <strong>Renouvellement</strong> : sauf résiliation, l’abonnement est reconduit
          tacitement pour une durée identique. Vous êtes informé·e par e-mail avant chaque
          renouvellement d’un abonnement de plus d’un mois.
        </li>
        <li>
          <strong>Droit de rétractation</strong> : vous disposez de 14 jours à compter de la
          souscription pour vous rétracter (article L221-18 du Code de la consommation). Si vous
          demandez expressément à accéder au Premium avant la fin de ce délai, le montant
          correspondant au service déjà fourni jusqu’à la rétractation reste dû, au prorata.
        </li>
        <li>
          <strong>Sanction</strong> : en cas d’exclusion pour manquement aux présentes CGU, la
          période d’abonnement en cours n’est pas remboursée.
        </li>
      </ul>

      <h2 id="resiliation">8. Résiliation et suppression du compte</h2>
      <h3>8.1 Résiliation de l’abonnement</h3>
      <p>
        Vous pouvez résilier votre abonnement <strong>à tout moment</strong>, en quelques clics,
        depuis les paramètres de votre compte (fonctionnalité de résiliation en ligne, article
        L215-1-1 du Code de la consommation). La résiliation prend effet à la fin de la période
        en cours ; aucun nouveau prélèvement n’est effectué. Vous conservez les avantages
        Premium jusqu’à cette date.
      </p>
      <h3>8.2 Suppression du compte</h3>
      <p>
        Vous pouvez supprimer votre compte à tout moment depuis Paramètres › Supprimer mon compte. La suppression
        est <strong>définitive</strong> : votre profil, vos photos, vos likes, vos matchs et vos
        messages sont effacés, sous réserve des durées de conservation légales décrites dans la{' '}
        <Link href="/legal/politique-confidentialite#conservation">
          Politique de confidentialité
        </Link>
        . La suppression du compte entraîne la résiliation de l’abonnement.
      </p>
      <h3>8.3 Résiliation à notre initiative</h3>
      <p>
        Nous pouvons suspendre ou supprimer un compte en cas de manquement aux présentes CGU ou
        à la Charte, dans les conditions de l’article 6. Un compte inactif pendant deux ans est
        supprimé automatiquement, après un préavis envoyé 30 jours avant par e-mail.
      </p>

      <h2 id="responsabilite">9. Responsabilité</h2>
      <p>
        Nous agissons en qualité d’hébergeur des contenus publiés par les membres et retirons
        promptement tout contenu manifestement illicite qui nous est signalé. Nous ne
        vérifions pas l’identité des membres et ne pouvons garantir la sincérité de leurs
        déclarations ni l’issue d’une rencontre.
      </p>
      <p>
        Pour vos rencontres hors ligne, suivez les conseils de sécurité de la Charte : premier
        rendez-vous dans un lieu public, prévenir un·e proche, ne jamais envoyer d’argent.
      </p>
      <p>
        Nous mettons tout en œuvre pour assurer la disponibilité du Service, sans pouvoir la
        garantir en permanence (maintenance, incident technique).
      </p>

      <h2 id="donnees">10. Données personnelles</h2>
      <p>
        Le traitement de vos données, y compris des données sensibles liées à l’utilisation du
        Service, est décrit dans la{' '}
        <Link href="/legal/politique-confidentialite">Politique de confidentialité</Link>.
      </p>

      <h2 id="modification">11. Modification des CGU</h2>
      <p>
        Nous pouvons faire évoluer les CGU. Toute modification substantielle vous est notifiée
        au moins 30 jours avant son entrée en vigueur ; votre nouvelle acceptation vous est alors
        demandée. Si vous refusez, vous pouvez supprimer votre compte.
      </p>

      <h2 id="droit">12. Droit applicable et litiges</h2>
      <p>
        Les présentes CGU sont soumises au droit français. En cas de litige, adressez d’abord
        une réclamation écrite à <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        À défaut de solution, vous pouvez recourir gratuitement au médiateur de la
        consommation : {LEGAL.mediator}. À défaut d’accord amiable, les tribunaux français sont
        compétents, sous réserve des règles protectrices applicables aux consommateur·rices.
      </p>
    </>
  );
}
