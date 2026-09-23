/**
 * Informations légales affichées dans les CGU et la politique de confidentialité.
 *
 * ⚠️ Les valeurs entre crochets sont à compléter avant la mise en ligne,
 * et l'ensemble des textes doit être relu par un·e juriste.
 */
export const LEGAL = {
  siteName: 'coeur-vrai.com',
  siteUrl: 'https://coeur-vrai.com',
  company: '[Raison sociale]',
  legalForm: '[Forme juridique et capital social]',
  address: '[Adresse du siège social]',
  rcs: '[Numéro RCS / SIREN]',
  publicationDirector: '[Nom du directeur ou de la directrice de la publication]',
  contactEmail: 'contact@coeur-vrai.com',
  dpoEmail: 'dpo@coeur-vrai.com',
  moderationEmail: 'moderation@coeur-vrai.com',
  host: '[Hébergeur — nom, adresse, téléphone ; serveurs situés dans l’Union européenne]',
  mediator: '[Médiateur de la consommation — nom et site web]',
};

/** Date de la version en vigueur. Doit correspondre à TERMS_VERSION côté backend. */
export const LEGAL_VERSION = '2026-09-23';
export const LEGAL_VERSION_LABEL = '23 septembre 2026';

export const LEGAL_PAGES = [
  { href: '/legal/cgu', label: 'Conditions générales d’utilisation', short: 'CGU' },
  {
    href: '/legal/politique-confidentialite',
    label: 'Politique de confidentialité',
    short: 'Confidentialité',
  },
  { href: '/legal/charte-communaute', label: 'Charte de la communauté', short: 'Charte' },
] as const;
