/** Injecte des données structurées JSON-LD (rendu serveur). */
export function JsonLd({ data }: { data: object | object[] }) {
  // Échappe « < » pour empêcher toute fermeture prématurée de la balise <script>.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
