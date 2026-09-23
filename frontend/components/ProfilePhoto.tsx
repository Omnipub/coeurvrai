import Image from 'next/image';

/** Hôtes dont les images sont optimisées par next/image (AVIF/WebP, tailles responsives). */
const OPTIMIZED_HOSTS = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? 'cdn.coeur-vrai.com')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

function isOptimizable(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && OPTIMIZED_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

interface Props {
  src: string;
  alt: string;
  /** Attribut `sizes` pour le choix de la résolution. */
  sizes: string;
  /** Image principale au-dessus de la ligne de flottaison : chargée en priorité. */
  priority?: boolean;
  className?: string;
}

/**
 * Photo de profil via next/image (lazy-loading par défaut, `fill` dans un
 * conteneur dimensionné pour éviter tout décalage de mise en page).
 * Les URL hors CDN configuré (NEXT_PUBLIC_IMAGE_HOSTS) sont servies telles quelles
 * pour ne pas transformer le serveur en proxy d'images ouvert.
 */
export function ProfilePhoto({ src, alt, sizes, priority = false, className = 'object-cover' }: Props) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimizable(src)}
      className={className}
    />
  );
}
