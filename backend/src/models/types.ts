export const ACCOUNT_TYPES = ['homme', 'femme_trans'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/**
 * Version en vigueur des CGU et de la charte (date de dernière mise à jour).
 * À modifier à chaque changement des textes, en même temps que
 * `LEGAL_VERSION` dans frontend/lib/legal.ts.
 */
export const TERMS_VERSION = '2026-09-23';

export type UserRole = 'user' | 'moderator' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'banned';

export const REPORT_REASONS = [
  'harcelement',
  'transphobie',
  'faux_profil',
  'contenu_inapproprie',
  'arnaque',
  'mineur',
  'autre',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  account_type: AccountType;
  birthdate: string;
  role: UserRole;
  status: UserStatus;
  stripe_customer_id: string | null;
  terms_accepted_date: Date | null;
  terms_version: string | null;
  gdpr_consent_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ProfileBase {
  user_id: string;
  display_name: string;
  bio: string;
  city: string | null;
  photos: string[];
  updated_at: Date;
}

export interface ProfileHomme extends ProfileBase {
  height_cm: number | null;
}

export interface ProfileFemmeTrans extends ProfileBase {
  pronouns: string | null;
  /** Si vrai, les photos ne sont visibles qu'après un match. */
  photos_matches_only: boolean;
}

export interface Match {
  id: string;
  user_a: string;
  user_b: string;
  created_at: Date;
  unmatched_at: Date | null;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: Date;
  read_at: Date | null;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  message_id: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  moderator_id: string | null;
  resolution_note: string | null;
  created_at: Date;
  resolved_at: Date | null;
}

/** Les likes et matchs ne sont possibles qu'entre un homme et une femme trans. */
export function compatibleAccountType(type: AccountType): AccountType {
  return type === 'homme' ? 'femme_trans' : 'homme';
}
