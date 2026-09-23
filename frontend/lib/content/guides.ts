/**
 * Guides éditoriaux publics (/guides/[slug]).
 * Chaque guide commence par une réponse directe (`summary`), pour les lecteurs
 * comme pour les moteurs de réponse.
 */
export interface GuideSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

export interface Guide {
  slug: string;
  /** Titre court (< 48 caractères, suffixe de marque ajouté). */
  title: string;
  /** Titre affiché en h1 (peut être plus long). */
  headline: string;
  description: string;
  /** Réponse directe à la question principale du guide. */
  summary: string;
  published: string;
  updated: string;
  readingMinutes: number;
  sections: GuideSection[];
}

export const GUIDES: Guide[] = [
  {
    slug: 'premier-rendez-vous-securite',
    title: 'Premier rendez-vous : conseils de sécurité',
    headline: 'Premier rendez-vous : 10 conseils pour une rencontre en toute sécurité',
    description:
      'Lieu public, proche prévenu, transport autonome, pas d’argent : 10 conseils concrets pour un premier rendez-vous serein après un match.',
    summary:
      'Pour un premier rendez-vous en sécurité après un match sur Cœur Vrai : échangez d’abord sur le site, retrouvez-vous dans un lieu public, prévenez un proche, gardez votre propre moyen de transport et n’envoyez jamais d’argent. Ces règles valent pour les femmes trans comme pour les hommes.',
    published: '2026-09-23',
    updated: '2026-09-23',
    readingMinutes: 4,
    sections: [
      {
        heading: 'Avant le rendez-vous',
        list: [
          'Discutez sur la messagerie de Cœur Vrai avant de donner votre numéro ou vos réseaux sociaux.',
          'Proposez un appel vidéo court : c’est le moyen le plus simple de vérifier que la personne correspond à ses photos.',
          'Privilégiez les profils portant le badge « Profil vérifié », sans vous en contenter : le badge atteste d’une personne réelle, pas de ses intentions.',
          'Parlez de vos attentes (amitié, relation sérieuse, rencontre) pour éviter les malentendus.',
        ],
      },
      {
        heading: 'Le jour J',
        list: [
          'Choisissez un lieu public et fréquenté (café, bar, parc en journée) que vous connaissez.',
          'Prévenez un·e proche : lieu, heure, prénom et photo de la personne ; convenez d’un message à l’heure du départ.',
          'Venez et repartez par vos propres moyens, afin de pouvoir partir quand vous le souhaitez.',
          'Gardez votre verre à l’œil et votre téléphone chargé.',
        ],
      },
      {
        heading: 'Les signaux d’alerte',
        paragraphs: [
          'Une demande d’argent, de cadeau ou de « frais de transport », une insistance pour se voir directement chez l’un ou l’autre, des questions intrusives sur le corps ou la transition, ou une pression pour garder la relation secrète sont des signaux d’alerte.',
          'En cas de doute, mettez fin à l’échange, bloquez et signalez le profil depuis Cœur Vrai : la personne est bloquée immédiatement et l’équipe de modération examine le signalement.',
        ],
      },
      {
        heading: 'En cas de danger',
        paragraphs: [
          'En France, appelez le 17 (police) ou le 112 (numéro d’urgence européen). Vous pouvez aussi être accompagné·e par une association de lutte contre les LGBTphobies.',
        ],
      },
    ],
  },
  {
    slug: 'aborder-femme-trans-avec-respect',
    title: 'Aborder une femme trans avec respect',
    headline: 'Hommes : comment aborder une femme trans avec respect',
    description:
      'Prénom et pronoms, questions à éviter, fétichisation, discrétion : le guide pour engager une conversation respectueuse avec une femme trans.',
    summary:
      'Pour aborder une femme trans avec respect, parlez-lui comme à n’importe quelle femme qui vous plaît : utilisez son prénom et ses pronoms, intéressez-vous à sa personnalité, évitez toute question sur son corps ou sa transition, et soyez honnête sur vos intentions.',
    published: '2026-09-23',
    updated: '2026-09-23',
    readingMinutes: 5,
    sections: [
      {
        heading: 'Une femme trans est une femme',
        paragraphs: [
          'Utilisez toujours son prénom et les pronoms indiqués sur son profil. Ne commentez pas son apparence en la comparant à une « vraie femme » : la formule, même voulue comme un compliment, est blessante.',
        ],
      },
      {
        heading: 'Les questions à éviter',
        list: [
          'Les questions sur ses organes génitaux, ses opérations ou ses traitements.',
          'Les questions sur son ancien prénom ou des photos d’avant sa transition.',
          '« Depuis quand es-tu une femme ? » ou toute question qui remet en cause son identité.',
        ],
        paragraphs: [
          'Si elle souhaite parler de son parcours, elle le fera d’elle-même, quand elle vous fera confiance.',
        ],
      },
      {
        heading: 'Éviter la fétichisation',
        paragraphs: [
          'Un premier message centré sur le sexe ou sur son corps la réduit à un fantasme. Les termes dégradants ou fétichisants sont interdits par la charte de Cœur Vrai, tout comme l’envoi de photos intimes non sollicitées.',
          'Intéressez-vous plutôt à ce qu’elle écrit dans sa biographie : ses passions, sa ville, ce qu’elle recherche.',
        ],
      },
      {
        heading: 'Discrétion et honnêteté',
        paragraphs: [
          'Vous n’êtes peut-être pas prêt à parler de vos rencontres autour de vous : c’est votre droit. Dites-le honnêtement, sans jamais lui demander d’avoir honte d’elle-même ou de se cacher.',
          'Aucune contrepartie : proposer de l’argent ou un avantage en échange d’une rencontre est interdit et entraîne l’exclusion définitive.',
        ],
      },
    ],
  },
  {
    slug: 'proteger-vie-privee-rencontre',
    title: 'Protéger sa vie privée sur un site de rencontre',
    headline: 'Protéger sa vie privée sur un site de rencontre',
    description:
      'Pseudo, photos, informations à ne pas partager, réglages de confidentialité : comment rester discret·e et éviter l’outing en ligne.',
    summary:
      'Pour protéger votre vie privée sur un site de rencontre, utilisez un pseudo, ne publiez ni nom de famille, ni lieu de travail, ni photos permettant de vous localiser, limitez la visibilité de vos photos et ne partagez vos coordonnées qu’en confiance. Sur Cœur Vrai, les profils ne sont jamais indexés par les moteurs de recherche.',
    published: '2026-09-23',
    updated: '2026-09-23',
    readingMinutes: 4,
    sections: [
      {
        heading: 'Ce que Cœur Vrai fait pour vous',
        list: [
          'Les profils, la messagerie et les paramètres ne sont visibles que par les membres connectés et exclus des moteurs de recherche.',
          'Les femmes trans peuvent réserver leurs photos à leurs matchs.',
          'Votre adresse e-mail et votre date de naissance exacte ne sont jamais affichées.',
          'Un blocage ou un signalement coupe immédiatement tout contact.',
        ],
      },
      {
        heading: 'Ce que vous pouvez faire',
        list: [
          'Choisissez un pseudo ou votre seul prénom.',
          'Évitez les photos devant votre domicile, votre lieu de travail ou des lieux reconnaissables.',
          'N’utilisez pas les mêmes photos que sur vos réseaux sociaux publics : une recherche d’image inversée pourrait vous identifier.',
          'Ne partagez votre numéro, votre nom complet ou vos réseaux qu’avec des personnes en qui vous avez confiance.',
        ],
      },
      {
        heading: 'Outing : ce que dit la charte',
        paragraphs: [
          'Révéler ou menacer de révéler la transidentité d’une personne, son ancien prénom ou sa présence sur Cœur Vrai est interdit et entraîne l’exclusion définitive. Les captures d’écran de profils ou de conversations diffusées ailleurs le sont aussi.',
        ],
      },
      {
        heading: 'Vos droits sur vos données',
        paragraphs: [
          'Depuis Paramètres, vous pouvez à tout moment télécharger vos données au format JSON, consulter l’historique de vos connexions et supprimer définitivement votre compte.',
        ],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
