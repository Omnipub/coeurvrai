import Link from 'next/link';
import { breadcrumbJsonLd, type Crumb } from '@/lib/jsonld';
import { JsonLd } from './JsonLd';

/** Fil d'Ariane visible + BreadcrumbList JSON-LD. Le dernier élément est la page courante. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const crumbs = [{ name: 'Accueil', path: '/' }, ...items];
  return (
    <>
      <nav aria-label="Fil d’Ariane" className="mb-4 text-sm text-gray-600">
        <ol className="flex flex-wrap items-center gap-1">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={c.path} className="flex items-center gap-1">
                {last ? (
                  <span aria-current="page" className="text-gray-800">
                    {c.name}
                  </span>
                ) : (
                  <>
                    <Link href={c.path} className="underline-offset-2 hover:underline">
                      {c.name}
                    </Link>
                    <span aria-hidden="true">›</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  );
}
