import { pool } from '../utils/db';
import { AccountType } from '../models/types';
import { canSeeClearPhotos, PHOTO_KEYS_SQL, PhotoKeys, signPhotos, Viewer } from './photos';

export const PROFILE_TABLE: Record<AccountType, string> = {
  homme: 'profiles_homme',
  femme_trans: 'profiles_femme_trans',
};

export interface PublicProfile {
  id: string;
  accountType: AccountType;
  displayName: string;
  age: number;
  city: string | null;
  bio: string;
  /** URL signées à durée courte (nettes ou floutées selon les droits du lecteur). */
  photos: string[];
  /** Vrai si les URL renvoyées sont celles des versions floutées. */
  photosBlurred: boolean;
  heightCm?: number | null;
  pronouns?: string | null;
  photosMatchesOnly?: boolean;
  /** Badge « Profil vérifié » : e-mail vérifié + contrôle Onfido approuvé. */
  verified: boolean;
}

/** Sélection SQL commune : profil + âge, pour un type de compte donné. */
export function profileSelect(type: AccountType): string {
  const extra =
    type === 'homme' ? 'p.height_cm' : 'p.pronouns, p.photos_matches_only';
  return `
    SELECT u.id, u.account_type, u.verified_badge,
           date_part('year', age(u.birthdate))::int AS age,
           p.display_name, p.city, p.bio, ${PHOTO_KEYS_SQL} AS photo_keys, ${extra}
      FROM users u
      JOIN ${PROFILE_TABLE[type]} p ON p.user_id = u.id`;
}

/**
 * Profil public vu par `viewer`. Les URL des photos sont signées ici, après
 * application des règles de visibilité (services/photos.ts).
 */
export async function toPublicProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any,
  { viewer, matched }: { viewer: Viewer; matched: boolean },
): Promise<PublicProfile> {
  const clear = await canSeeClearPhotos(
    viewer,
    { id: row.id, accountType: row.account_type, photosMatchesOnly: row.photos_matches_only },
    matched,
  );
  const keys = (row.photo_keys ?? []) as PhotoKeys[];
  const profile: PublicProfile = {
    id: row.id,
    accountType: row.account_type,
    displayName: row.display_name,
    age: row.age,
    city: row.city,
    bio: row.bio,
    photos: await signPhotos(keys, clear),
    photosBlurred: keys.length > 0 && !clear,
    verified: row.verified_badge,
  };
  if (row.account_type === 'homme') {
    profile.heightCm = row.height_cm;
  } else {
    profile.pronouns = row.pronouns;
    profile.photosMatchesOnly = row.photos_matches_only;
  }
  return profile;
}

export async function hasActiveMatch(a: string, b: string): Promise<boolean> {
  const [userA, userB] = a < b ? [a, b] : [b, a];
  const { rowCount } = await pool.query(
    'SELECT 1 FROM matches WHERE user_a = $1 AND user_b = $2 AND unmatched_at IS NULL',
    [userA, userB],
  );
  return (rowCount ?? 0) > 0;
}
