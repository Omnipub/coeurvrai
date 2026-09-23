/**
 * FAQ : questions/réponses courtes et factuelles.
 * Rendue sur /faq et sérialisée en JSON-LD FAQPage (texte brut uniquement).
 */
export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqGroup {
  id: string;
  title: string;
  items: FaqItem[];
}

export const FAQ_UPDATED = '2026-09-23';

export const FAQ: FaqGroup[] = [
  {
    id: 'service',
    title: 'Le service',
    items: [
      {
        question: 'Qu’est-ce que Cœur Vrai ?',
        answer:
          'Cœur Vrai est un site de rencontre en ligne réservé aux relations entre hommes et femmes trans. Il met en relation des adultes qui cherchent une rencontre sincère et respectueuse, avec une modération humaine et une forte protection de la vie privée.',
      },
      {
        question: 'Cœur Vrai est-il gratuit ?',
        answer:
          'Oui. L’inscription, le profil, la découverte des profils, les likes, les matchs, la messagerie, le blocage et le signalement sont gratuits. Un abonnement Premium facultatif pourra être proposé ; son prix sera affiché avant toute souscription.',
      },
      {
        question: 'Qui peut s’inscrire sur Cœur Vrai ?',
        answer:
          'Les hommes et les femmes trans âgés d’au moins 18 ans. Chaque personne choisit son type de compte à l’inscription et ne peut ouvrir qu’un seul compte.',
      },
      {
        question: 'Qui vais-je voir sur Cœur Vrai ?',
        answer:
          'Les hommes voient uniquement des profils de femmes trans, et les femmes trans voient uniquement des profils d’hommes. Les profils bloqués ou suspendus ne sont jamais proposés.',
      },
      {
        question: 'Comment fonctionne un match ?',
        answer:
          'Vous aimez un profil ; si cette personne vous aime aussi, c’est un match. Seules les personnes qui ont matché peuvent s’écrire. Vous pouvez mettre fin à un match à tout moment : la conversation est alors fermée.',
      },
    ],
  },
  {
    id: 'confidentialite',
    title: 'Confidentialité',
    items: [
      {
        question: 'Mon profil peut-il apparaître sur Google ?',
        answer:
          'Non. Les profils, la découverte, la messagerie et les paramètres ne sont accessibles qu’aux membres connectés et sont exclus des moteurs de recherche. Seules les pages d’information publiques du site sont indexées.',
      },
      {
        question: 'Qui peut voir mes photos ?',
        answer:
          'Les membres dont le type de compte est compatible avec le vôtre. Les femmes trans peuvent choisir de ne montrer leurs photos qu’aux personnes avec qui elles ont matché.',
      },
      {
        question: 'Mes données sont-elles vendues ou utilisées pour de la publicité ?',
        answer:
          'Non. Cœur Vrai ne vend aucune donnée, ne fait pas de publicité ciblée et n’utilise aucun traceur publicitaire. Les données sont hébergées dans l’Union européenne.',
      },
      {
        question: 'Puis-je récupérer mes données ?',
        answer:
          'Oui. Depuis Paramètres, le bouton « Télécharger mes données » fournit en un clic un fichier JSON avec votre compte, votre profil, vos likes, vos matchs, vos messages envoyés et votre historique de connexion.',
      },
      {
        question: 'Comment supprimer mon compte ?',
        answer:
          'Depuis Paramètres, puis « Supprimer mon compte ». Après confirmation de votre e-mail et de votre mot de passe, votre profil, vos photos, vos likes, vos matchs et vos conversations sont définitivement effacés.',
      },
    ],
  },
  {
    id: 'securite',
    title: 'Sécurité et vérification',
    items: [
      {
        question: 'Que signifie le badge « Profil vérifié » ?',
        answer:
          'Le badge indique que la personne a confirmé son adresse e-mail et réussi une vérification par selfie vidéo, qui prouve qu’elle est une personne réelle. Il ne garantit ni son identité civile ni ses intentions.',
      },
      {
        question: 'La vérification d’identité est-elle obligatoire ?',
        answer:
          'Non, elle est facultative. Elle se fait en une minute avec un selfie vidéo analysé par notre prestataire Onfido, après votre consentement explicite. Cœur Vrai ne conserve que le résultat, jamais la vidéo.',
      },
      {
        question: 'Comment signaler un comportement inacceptable ?',
        answer:
          'Avec le bouton « Signaler » d’un profil ou d’une conversation. La personne signalée est bloquée immédiatement et ne peut plus vous voir ni vous écrire ; l’équipe de modération examine ensuite le signalement.',
      },
      {
        question: 'Quels comportements sont interdits ?',
        answer:
          'Tolérance zéro pour la transphobie, l’outing (révéler la transidentité ou la présence d’une personne sur le site), la prostitution et toute contrepartie financière, le harcèlement, les arnaques et toute présence de personne mineure.',
      },
      {
        question: 'Que faire en cas de danger lors d’une rencontre ?',
        answer:
          'En France, appelez le 17 (police) ou le 112 (urgences européennes). Signalez ensuite le profil sur Cœur Vrai pour protéger les autres membres.',
      },
    ],
  },
];

export const FAQ_ITEMS = FAQ.flatMap((group) => group.items);
