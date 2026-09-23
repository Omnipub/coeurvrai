import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PAGES } from '@/lib/content/pages';
import { LEGAL } from '@/lib/legal';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata(PAGES.privacy);

const dpo = <a href={`mailto:${LEGAL.dpoEmail}`}>{LEGAL.dpoEmail}</a>;

export default function PrivacyPage() {
  return (
    <>
      <Breadcrumbs items={[{ name: PAGES.privacy.label, path: PAGES.privacy.path }]} />
      <h1>Politique de confidentialité</h1>
      <p className="lead">
        Utiliser un site de rencontre entre hommes et femmes trans révèle des informations
        intimes. Nous en avons conscience : la protection de votre vie privée est au cœur de
        {` ${LEGAL.siteName}`}. Cette politique explique quelles données nous traitons,
        pourquoi, combien de temps, et comment exercer vos droits, conformément au Règlement
        général sur la protection des données (RGPD) et à la loi Informatique et Libertés.
      </p>

      <div className="callout">
        <p className="mb-0">
          <strong>L’essentiel :</strong> nous ne vendons pas vos données, nous ne faisons pas de
          publicité ciblée, votre profil n’est visible que par les membres compatibles, et vous
          pouvez supprimer votre compte à tout moment.
        </p>
      </div>

      <nav className="toc" aria-label="Sommaire">
        <ol>
          <li><a href="#responsable">Responsable du traitement</a></li>
          <li><a href="#donnees">Données collectées</a></li>
          <li><a href="#sensibles">Données sensibles (article 9 du RGPD)</a></li>
          <li><a href="#finalites">Finalités et bases légales</a></li>
          <li><a href="#consentement">Consentement et retrait</a></li>
          <li><a href="#verification">Vérification de l’e-mail et de l’identité</a></li>
          <li><a href="#visibilite">Qui voit vos informations</a></li>
          <li><a href="#tiers">Sous-traitants et transferts hors UE</a></li>
          <li><a href="#conservation">Durées de conservation</a></li>
          <li><a href="#securite">Sécurité</a></li>
          <li><a href="#droits">Vos droits</a></li>
          <li><a href="#cookies">Cookies et stockage local</a></li>
          <li><a href="#mineurs">Mineur·es</a></li>
          <li><a href="#modifications">Modifications</a></li>
        </ol>
      </nav>

      <h2 id="responsable">1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est {LEGAL.company}, {LEGAL.address} ({LEGAL.rcs}). Pour
        toute question sur vos données, contactez notre délégué·e à la protection des données
        (DPO) : {dpo}.
      </p>

      <h2 id="donnees">2. Données collectées</h2>
      <table>
        <thead>
          <tr>
            <th>Catégorie</th>
            <th>Données</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Compte</td>
            <td>
              Adresse e-mail, mot de passe (stocké uniquement sous forme chiffrée par hachage
              bcrypt), date de naissance, type de compte (homme / femme trans)
            </td>
          </tr>
          <tr>
            <td>Profil</td>
            <td>Pseudo, biographie, ville, photos, taille, pronoms, préférences de visibilité</td>
          </tr>
          <tr>
            <td>Activité</td>
            <td>Likes, matchs, messages échangés, blocages</td>
          </tr>
          <tr>
            <td>Modération</td>
            <td>Signalements émis ou reçus, messages cités, décisions de modération</td>
          </tr>
          <tr>
            <td>Vérification</td>
            <td>
              Date de confirmation de l’e-mail ; identifiants et statut de la vérification
              d’identité Onfido (facultative), date du consentement correspondant
            </td>
          </tr>
          <tr>
            <td>Consentements</td>
            <td>Date d’acceptation des CGU et de la Charte, version acceptée, date du consentement RGPD</td>
          </tr>
          <tr>
            <td>Paiement</td>
            <td>
              Identifiant client Stripe, historique d’abonnement et factures. Vos numéros de
              carte sont traités par Stripe et ne nous sont jamais transmis.
            </td>
          </tr>
          <tr>
            <td>Technique</td>
            <td>Adresse IP, date et heure de connexion, type de navigateur</td>
          </tr>
        </tbody>
      </table>
      <p>
        Nous ne collectons ni votre identité civile, ni votre ancien prénom, ni vos données de
        santé ou de parcours de transition. N’en publiez pas dans votre profil.
      </p>

      <h2 id="sensibles">3. Données sensibles (article 9 du RGPD)</h2>
      <p>
        Le seul fait d’être inscrit·e sur {LEGAL.siteName} et le type de compte choisi révèlent
        des informations relatives à votre <strong>vie sexuelle</strong>, à votre{' '}
        <strong>orientation sexuelle</strong> et à votre <strong>identité de genre</strong>. Ces
        données relèvent des catégories particulières de l’article 9 du RGPD, dont le
        traitement est en principe interdit.
      </p>
      <p>
        Nous ne les traitons que sur le fondement de votre{' '}
        <strong>consentement explicite</strong> (article 9.2.a), recueilli lors de
        l’inscription par une case à cocher distincte de l’acceptation des CGU. Ces données
        sont utilisées <strong>uniquement</strong> pour vous proposer des profils compatibles et
        faire fonctionner le Service. Elles ne sont jamais utilisées à des fins publicitaires,
        jamais vendues, et jamais communiquées à des tiers en dehors des cas prévus à l’article 7.
      </p>

      <h2 id="finalites">4. Finalités et bases légales</h2>
      <table>
        <thead>
          <tr>
            <th>Finalité</th>
            <th>Base légale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Création et gestion du compte, mise en relation, messagerie</td>
            <td>Exécution du contrat (CGU) — art. 6.1.b ; consentement explicite pour les données sensibles — art. 9.2.a</td>
          </tr>
          <tr>
            <td>Modération, traitement des signalements, prévention des fraudes et des abus</td>
            <td>Intérêt légitime à assurer la sécurité des membres — art. 6.1.f</td>
          </tr>
          <tr>
            <td>Vérification de la majorité</td>
            <td>Obligation légale et intérêt légitime — art. 6.1.c et f</td>
          </tr>
          <tr>
            <td>Abonnement, facturation, comptabilité</td>
            <td>Exécution du contrat et obligation légale — art. 6.1.b et c</td>
          </tr>
          <tr>
            <td>Conservation des données de connexion</td>
            <td>Obligation légale (LCEN) — art. 6.1.c</td>
          </tr>
          <tr>
            <td>Réponse aux réquisitions judiciaires</td>
            <td>Obligation légale — art. 6.1.c</td>
          </tr>
          <tr>
            <td>Preuve des consentements recueillis</td>
            <td>Obligation légale (principe de responsabilité, art. 7.1 du RGPD)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Aucune décision produisant des effets juridiques à votre égard n’est prise sur le seul
        fondement d’un traitement automatisé : les sanctions de modération sont toujours
        décidées par une personne.
      </p>

      <h2 id="consentement">5. Consentement et retrait</h2>
      <p>
        À l’inscription, nous enregistrons la date et la version des CGU et de la Charte que vous
        avez acceptées, ainsi que la date de votre consentement au traitement des données
        sensibles, afin de pouvoir en apporter la preuve.
      </p>
      <p>
        Vous pouvez <strong>retirer votre consentement à tout moment</strong>. Le Service ne
        pouvant fonctionner sans ces données, le retrait du consentement entraîne la
        suppression de votre compte. Le retrait ne remet pas en cause la licéité des
        traitements effectués auparavant.
      </p>

      <h2 id="verification">6. Vérification de l’e-mail et de l’identité</h2>
      <h3>Confirmation de l’adresse e-mail</h3>
      <p>
        À l’inscription, nous vous envoyons un lien de confirmation valable 24 heures. Nous
        conservons uniquement une empreinte chiffrée (hachage) de ce lien, effacée dès son
        utilisation, et la date de confirmation de votre adresse. Base légale : exécution du
        contrat et sécurité du Service.
      </p>
      <h3>Vérification d’identité par selfie (facultative)</h3>
      <p>
        Pour obtenir le badge « Profil vérifié », vous pouvez réaliser un court selfie vidéo
        analysé par notre prestataire <strong>Onfido</strong>, afin de vérifier que vous êtes une
        personne réelle (détection du vivant). Cette analyse implique des{' '}
        <strong>données biométriques</strong>, qui relèvent de l’article 9 du RGPD : elle n’a
        lieu qu’avec votre <strong>consentement explicite</strong>, recueilli juste avant la
        capture par une case à cocher distincte. Elle est entièrement facultative et son refus
        n’a aucune conséquence sur l’utilisation du Service.
      </p>
      <ul>
        <li>
          Nous ne transmettons à Onfido ni votre nom, ni votre e-mail, ni votre date de
          naissance : votre dossier y est créé sous un nom générique.
        </li>
        <li>
          Nous ne recevons ni ne conservons votre selfie : seuls les identifiants Onfido, le
          statut de la vérification (par exemple « approuvée » ou « refusée ») et sa date sont
          enregistrés.
        </li>
        <li>
          Le badge affiché aux autres membres indique seulement que l’e-mail est confirmé et que
          la vérification a réussi.
        </li>
        <li>
          Lorsque vous supprimez votre compte, nous demandons à Onfido de supprimer votre dossier
          et les données associées.
        </li>
      </ul>

      <h2 id="visibilite">7. Qui voit vos informations</h2>
      <ul>
        <li>
          <strong>Membres</strong> : votre profil (pseudo, âge, ville, biographie, photos) n’est
          présenté qu’aux membres dont le type de compte est compatible avec le vôtre. Votre
          adresse e-mail et votre date de naissance exacte ne sont jamais affichées.
        </li>
        <li>
          <strong>Photos privées</strong> : les femmes trans peuvent choisir de ne rendre leurs
          photos visibles qu’à leurs matchs.
        </li>
        <li>
          <strong>Messages</strong> : ils ne sont visibles que par les deux membres du match. Ils
          ne sont consultés par l’équipe de modération que lorsqu’un message est signalé.
        </li>
        <li>
          <strong>Blocage</strong> : une personne que vous bloquez ou signalez ne voit plus votre
          profil et ne peut plus vous écrire.
        </li>
        <li>
          <strong>Équipe interne</strong> : seul le personnel habilité (support, modération),
          tenu à la confidentialité, accède aux données nécessaires à sa mission.
        </li>
      </ul>

      <h2 id="tiers">8. Sous-traitants et transferts hors UE</h2>
      <p>
        Nous faisons appel à des prestataires (sous-traitants) liés par contrat et tenus de
        protéger vos données. Ils n’agissent que sur nos instructions.
      </p>
      <table>
        <thead>
          <tr>
            <th>Prestataire</th>
            <th>Rôle</th>
            <th>Localisation et garanties</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{LEGAL.host}</td>
            <td>Hébergement de l’application et des bases de données</td>
            <td>Union européenne</td>
          </tr>
          <tr>
            <td>Stripe Payments Europe Ltd.</td>
            <td>Paiement des abonnements</td>
            <td>
              Irlande ; transferts possibles vers les États-Unis encadrés par le Data Privacy
              Framework UE–États-Unis et des clauses contractuelles types de la Commission
              européenne. Stripe ne reçoit aucune donnée de profil ni aucune donnée sensible.
            </td>
          </tr>
          <tr>
            <td>Onfido (groupe Entrust)</td>
            <td>Vérification d’identité par selfie (facultative)</td>
            <td>
              Région de traitement : Union européenne. Transferts éventuels hors UE encadrés par
              des clauses contractuelles types. Onfido ne reçoit aucune donnée de profil. [À
              compléter selon le contrat : entité contractante et durée de conservation chez
              Onfido.]
            </td>
          </tr>
          <tr>
            <td>[Prestataire d’envoi d’e-mails]</td>
            <td>E-mails transactionnels (confirmation, sécurité, facturation)</td>
            <td>[À compléter — de préférence Union européenne]</td>
          </tr>
        </tbody>
      </table>
      <p>
        Vos données peuvent enfin être communiquées aux autorités judiciaires ou
        administratives lorsque la loi l’exige (réquisition). Nous ne partageons jamais vos
        données avec des annonceurs, courtiers en données ou réseaux sociaux.
      </p>

      <h2 id="conservation">9. Durées de conservation</h2>
      <table>
        <thead>
          <tr>
            <th>Données</th>
            <th>Durée</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Compte, profil, likes, matchs, messages</td>
            <td>
              Tant que le compte est actif. Suppression immédiate à la suppression du compte
              (purge des sauvegardes sous 30 jours). Compte inactif depuis 2 ans : supprimé
              automatiquement, après un e-mail de préavis envoyé 30 jours avant.
            </td>
          </tr>
          <tr>
            <td>Match rompu</td>
            <td>Les messages ne sont plus accessibles ; ils sont effacés avec les comptes concernés</td>
          </tr>
          <tr>
            <td>Lien de confirmation d’e-mail</td>
            <td>24 heures (effacé dès utilisation)</td>
          </tr>
          <tr>
            <td>Statut de la vérification d’identité</td>
            <td>Tant que le compte est actif ; dossier Onfido supprimé avec le compte</td>
          </tr>
          <tr>
            <td>Preuves de consentement (dates et version)</td>
            <td>Durée du compte + 5 ans (prescription civile)</td>
          </tr>
          <tr>
            <td>Signalements et décisions de modération</td>
            <td>1 an après la clôture du signalement</td>
          </tr>
          <tr>
            <td>Compte exclu définitivement</td>
            <td>
              Empreinte (hachage) de l’adresse e-mail conservée 3 ans pour empêcher la
              réinscription ; le reste est supprimé
            </td>
          </tr>
          <tr>
            <td>Données de connexion (adresse IP, horodatage, dernière activité)</td>
            <td>1 an, puis suppression automatique</td>
          </tr>
          <tr>
            <td>Factures et pièces comptables</td>
            <td>10 ans (article L123-22 du Code de commerce)</td>
          </tr>
          <tr>
            <td>Données en cas de litige ou de réquisition</td>
            <td>Jusqu’à l’issue de la procédure</td>
          </tr>
        </tbody>
      </table>

      <h2 id="securite">10. Sécurité</h2>
      <ul>
        <li>Connexions chiffrées (HTTPS) ;</li>
        <li>mots de passe hachés avec bcrypt, jamais stockés en clair ;</li>
        <li>accès aux données limité au personnel habilité ;</li>
        <li>limitation du nombre de tentatives de connexion et d’inscription ;</li>
        <li>hébergement dans l’Union européenne.</li>
      </ul>
      <p>
        En cas de violation de données présentant un risque élevé pour vos droits, nous
        informons la CNIL sous 72 heures et vous prévenons dans les meilleurs délais.
      </p>

      <h2 id="droits">11. Vos droits</h2>
      <p>Vous disposez des droits suivants sur vos données :</p>
      <ul>
        <li>
          <strong>Accès</strong> : obtenir une copie de vos données (art. 15), en un clic depuis
          Paramètres › Exporter mes données ;
        </li>
        <li><strong>Rectification</strong> : corriger des données inexactes (art. 16), directement depuis votre profil ;</li>
        <li>
          <strong>Effacement</strong> : supprimer votre compte à tout moment depuis Paramètres,
          ou nous le demander (art. 17) ;
        </li>
        <li>
          <strong>Portabilité</strong> : recevoir vos données dans un format structuré et lisible
          par machine (art. 20) — l’export est au format JSON ;
        </li>
        <li><strong>Limitation</strong> du traitement (art. 18) ;</li>
        <li><strong>Opposition</strong> aux traitements fondés sur notre intérêt légitime (art. 21) ;</li>
        <li><strong>Retrait du consentement</strong> à tout moment (art. 7.3) ;</li>
        <li>
          <strong>Directives post-mortem</strong> : définir le sort de vos données après votre
          décès (article 85 de la loi Informatique et Libertés).
        </li>
      </ul>
      <p>
        L’export et la suppression sont disponibles directement dans les Paramètres ; vous y
        voyez aussi votre dernière activité et l’historique de vos adresses IP. Pour toute autre
        demande, écrivez à {dpo} depuis l’adresse e-mail de votre compte. Nous
        répondons dans un délai d’un mois (prolongeable de deux mois pour les demandes
        complexes, auquel cas nous vous en informons). Nous pourrons vous demander de confirmer
        votre identité en cas de doute raisonnable.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
        réclamation auprès de la CNIL (
        <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener noreferrer">
          cnil.fr/fr/plaintes
        </a>
        ).
      </p>

      <h2 id="cookies">12. Cookies et stockage local</h2>
      <p>
        {LEGAL.siteName} n’utilise <strong>aucun cookie publicitaire ni traceur tiers</strong>.
        Nous conservons uniquement dans votre navigateur (stockage local) le jeton de session
        qui vous maintient connecté·e. Ce stockage est strictement nécessaire au fonctionnement
        du Service et ne requiert pas de consentement. Il est effacé à la déconnexion.
      </p>

      <h2 id="mineurs">13. Mineur·es</h2>
      <p>
        Le Service est strictement réservé aux personnes majeures. Si nous apprenons qu’un
        compte appartient à une personne mineure, il est supprimé sans délai. Vous pouvez nous
        le signaler via l’application (motif « Personne mineure ») ou à {dpo}.
      </p>

      <h2 id="modifications">14. Modifications</h2>
      <p>
        Nous pouvons mettre à jour cette politique. En cas de changement important, vous en
        serez informé·e par e-mail ou dans l’application avant son entrée en vigueur. Voir aussi
        nos <Link href="/legal/cgu">Conditions générales d’utilisation</Link>.
      </p>
    </>
  );
}
