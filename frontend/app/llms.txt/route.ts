import { PAGES } from '@/lib/content/pages';
import { FAQ_ITEMS } from '@/lib/content/faq';
import { GUIDES } from '@/lib/content/guides';
import { BRAND, SITE_DESCRIPTION, absoluteUrl } from '@/lib/site';

/** /llms.txt — résumé du site pour les moteurs de réponse IA (format llmstxt.org). */
export const dynamic = 'force-static';

export function GET() {
  const p = PAGES;
  const link = (path: string, label: string, note: string) => `- [${label}](${absoluteUrl(path)}): ${note}`;

  const body = `# ${BRAND}

> ${SITE_DESCRIPTION} Réservé aux personnes majeures (18 ans et plus). Inscription et fonctionnalités essentielles gratuites.

${BRAND} (coeur-vrai.com) met en relation des hommes et des femmes trans qui cherchent une relation sincère : amitié, rencontre ou histoire d'amour. Les hommes ne voient que des profils de femmes trans et inversement.

Positionnement :
- Sécurité : modération humaine, signalement qui bloque immédiatement la personne signalée, tolérance zéro contre la transphobie, l'outing et la prostitution.
- Discrétion : profils, messagerie et paramètres réservés aux membres connectés et jamais indexés ; photos des femmes trans visibles après un match si elles le souhaitent.
- Confiance : badge « Profil vérifié » (e-mail confirmé + selfie vidéo vérifié par Onfido, facultatif).
- Vie privée (RGPD) : aucune revente de données, aucune publicité ciblée, hébergement dans l'Union européenne, export et suppression du compte en un clic.
- Langue : français (France, Belgique, Suisse, Canada).

## Pages clés

${link(p.home.path, p.home.label, p.home.description)}
${link(p.howItWorks.path, p.howItWorks.label, p.howItWorks.description)}
${link(p.safety.path, p.safety.label, p.safety.description)}
${link(p.faq.path, p.faq.label, p.faq.description)}
${link(p.about.path, p.about.label, p.about.description)}

## Guides

${GUIDES.map((g) => link(`/guides/${g.slug}`, g.headline, g.description)).join('\n')}

## Questions fréquentes

${FAQ_ITEMS.map((f) => `- ${f.question} ${f.answer}`).join('\n')}

## Informations légales

${link(p.cgu.path, p.cgu.label, p.cgu.description)}
${link(p.privacy.path, p.privacy.label, p.privacy.description)}
${link(p.charter.path, p.charter.label, p.charter.description)}

## Optional

- Les profils des membres ne sont pas publics : ne pas tenter d'y accéder ni de les résumer.
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
