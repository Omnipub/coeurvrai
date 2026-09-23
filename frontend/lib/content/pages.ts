/**
 * Registre des pages publiques indexables.
 * Utilisé par les métadonnées, le sitemap, les images Open Graph et /llms.txt.
 */
export interface PublicPage {
  /** Clé stable (sert aussi d'URL pour l'image Open Graph : /og/<key>). */
  key: string;
  path: string;
  /** Titre court (le suffixe « | Cœur Vrai » est ajouté, total < 60 caractères). */
  title: string;
  /** Titre complet, utilisé tel quel (accueil). */
  absoluteTitle?: string;
  /** Meta description (< 155 caractères). */
  description: string;
  /** Libellé du fil d'Ariane et des menus. */
  label: string;
  /** Date de dernière mise à jour (ISO). */
  updated: string;
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
  priority: number;
}

export const CONTENT_UPDATED = '2026-09-23';

export const PAGES = {
  home: {
    key: 'accueil',
    path: '/',
    title: 'Accueil',
    absoluteTitle: 'Cœur Vrai – Rencontres entre hommes et femmes trans',
    description:
      'Site de rencontre gratuit et bienveillant entre hommes et femmes trans : profils modérés, photos privées, badge vérifié. Réservé aux 18 ans et plus.',
    label: 'Accueil',
    updated: CONTENT_UPDATED,
    changeFrequency: 'weekly',
    priority: 1,
  },
  howItWorks: {
    key: 'comment-ca-marche',
    path: '/comment-ca-marche',
    title: 'Comment ça marche',
    description:
      'Inscription gratuite, profil, likes réciproques, match puis messagerie privée : découvrez en 4 étapes comment fonctionne Cœur Vrai.',
    label: 'Comment ça marche',
    updated: CONTENT_UPDATED,
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  safety: {
    key: 'securite',
    path: '/securite',
    title: 'Sécurité et confidentialité',
    description:
      'Profils jamais indexés, photos visibles après un match, blocage et signalement en un clic, modération humaine : comment Cœur Vrai protège ses membres.',
    label: 'Sécurité',
    updated: CONTENT_UPDATED,
    changeFrequency: 'monthly',
    priority: 0.9,
  },
  faq: {
    key: 'faq',
    path: '/faq',
    title: 'FAQ – Questions fréquentes',
    description:
      'Réponses courtes sur Cœur Vrai : prix, inscription, qui peut s’inscrire, confidentialité, badge vérifié, signalement et suppression de compte.',
    label: 'FAQ',
    updated: CONTENT_UPDATED,
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  about: {
    key: 'a-propos',
    path: '/a-propos',
    title: 'À propos de Cœur Vrai',
    description:
      'Pourquoi Cœur Vrai existe : offrir aux femmes trans et aux hommes qui les aiment un site de rencontre sûr, discret et respectueux.',
    label: 'À propos',
    updated: CONTENT_UPDATED,
    changeFrequency: 'yearly',
    priority: 0.6,
  },
  guides: {
    key: 'guides',
    path: '/guides',
    title: 'Guides rencontres et sécurité',
    description:
      'Conseils pratiques pour des rencontres respectueuses entre hommes et femmes trans : premier rendez-vous, vie privée, bons mots à employer.',
    label: 'Guides',
    updated: CONTENT_UPDATED,
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  cgu: {
    key: 'cgu',
    path: '/legal/cgu',
    title: 'Conditions générales d’utilisation',
    description:
      'Conditions générales d’utilisation de Cœur Vrai : inscription, tolérance zéro, modération, abonnement, résiliation et suppression du compte.',
    label: 'CGU',
    updated: CONTENT_UPDATED,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  privacy: {
    key: 'politique-confidentialite',
    path: '/legal/politique-confidentialite',
    title: 'Politique de confidentialité',
    description:
      'Comment Cœur Vrai protège vos données personnelles et sensibles (RGPD) : finalités, durées de conservation, sous-traitants et vos droits.',
    label: 'Confidentialité',
    updated: CONTENT_UPDATED,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  charter: {
    key: 'charte-communaute',
    path: '/legal/charte-communaute',
    title: 'Charte de la communauté',
    description:
      'Les règles de respect de Cœur Vrai pour les hommes et les femmes trans : consentement, vie privée et tolérance zéro contre la transphobie.',
    label: 'Charte',
    updated: CONTENT_UPDATED,
    changeFrequency: 'yearly',
    priority: 0.4,
  },
} satisfies Record<string, PublicPage>;

export type PageId = keyof typeof PAGES;

export const ALL_PAGES: PublicPage[] = Object.values(PAGES);
