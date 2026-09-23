import { pool } from '../utils/db';
import { AccountType } from '../models/types';

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
  photos: string[];
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
           p.display_name, p.city, p.bio, p.photos, ${extra}
      FROM users u
      JOIN ${PROFILE_TABLE[type]} p ON p.user_id = u.id`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toPublicProfile(row: any, opts: { revealPhotos: boolean }): PublicProfile {
  const profile: PublicProfile = {
    id: row.id,
    accountType: row.account_type,
    displayName: row.display_name,
    age: row.age,
    city: row.city,
    bio: row.bio,
    photos: row.photos,
    verified: row.verified_badge,
  };
  if (row.account_type === 'homme') {
    profile.heightCm = row.height_cm;
  } else {
    profile.pronouns = row.pronouns;
    profile.photosMatchesOnly = row.photos_matches_only;
    if (row.photos_matches_only && !opts.revealPhotos) profile.photos = [];
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
