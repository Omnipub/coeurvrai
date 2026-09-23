import { ImageResponse } from 'next/og';
import { ALL_PAGES } from '@/lib/content/pages';
import { GUIDES } from '@/lib/content/guides';
import { BRAND } from '@/lib/site';

/**
 * Images Open Graph / Twitter (1200×630) générées au build, une par page publique :
 * /og/<clé de page>, /og/guide-<slug>, et /og/logo (512×512, logo JSON-LD).
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

type Card = { title: string; subtitle: string };

const CARDS: Record<string, Card> = {
  ...Object.fromEntries(
    ALL_PAGES.map((p) => [p.key, { title: p.absoluteTitle ?? p.title, subtitle: p.description }]),
  ),
  ...Object.fromEntries(GUIDES.map((g) => [`guide-${g.slug}`, { title: g.headline, subtitle: 'Guide' }])),
};

export function generateStaticParams() {
  return [...Object.keys(CARDS), 'logo'].map((key) => ({ key }));
}

const ROSE = '#be123c';

function Heart({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        fill={ROSE}
        d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.7 1.2 4.4 2.6h2c.7-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.2C19.5 16.4 12 21 12 21z"
      />
    </svg>
  );
}

export function GET(_req: Request, { params }: { params: { key: string } }) {
  if (params.key === 'logo') {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff1f3' }}>
          <Heart size={360} />
        </div>
      ),
      { width: 512, height: 512 },
    );
  }

  const card = CARDS[params.key];
  if (!card) return new Response('Not found', { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #fff1f3 0%, #ffe0e5 100%)',
          color: '#111827',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Heart size={56} />
          <span style={{ fontSize: 40, fontWeight: 700, color: ROSE }}>{BRAND}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: card.title.length > 50 ? 56 : 68, fontWeight: 700, lineHeight: 1.1 }}>{card.title}</div>
          <div style={{ fontSize: 28, color: '#4b5563', lineHeight: 1.35 }}>{card.subtitle}</div>
        </div>
        <div style={{ fontSize: 24, color: '#6b7280' }}>coeur-vrai.com · Rencontres entre hommes et femmes trans</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
