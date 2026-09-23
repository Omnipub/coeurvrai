export type AccountType = 'homme' | 'femme_trans';

export interface AuthUser {
  id: string;
  email: string;
  accountType: AccountType;
  role: 'user' | 'moderator' | 'admin';
  emailVerified: boolean;
  /** Badge « Profil vérifié » (e-mail + Onfido). */
  verified: boolean;
}

export interface Profile {
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
  verified: boolean;
}

export interface MatchSummary {
  matchId: string;
  createdAt: string;
  user: { id: string; displayName: string; photo: string | null; verified: boolean };
  lastMessage: { content: string; createdAt: string } | null;
}

export interface ChatMessage {
  id: string;
  matchId?: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt?: string | null;
}

export const REPORT_REASONS = {
  harcelement: 'Harcèlement',
  transphobie: 'Transphobie',
  faux_profil: 'Faux profil',
  contenu_inapproprie: 'Contenu inapproprié',
  arnaque: 'Arnaque',
  mineur: 'Personne mineure',
  autre: 'Autre',
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

export type OnfidoStatus =
  | 'awaiting_input'
  | 'processing'
  | 'approved'
  | 'declined'
  | 'review'
  | 'abandoned'
  | 'error';

export interface VerificationStatus {
  email: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  onfidoStatus: OnfidoStatus | null;
  onfidoCheckedAt: string | null;
  verifiedBadge: boolean;
  onfidoAvailable: boolean;
}

export interface IpLogEntry {
  ip: string;
  date: string;
}

export interface AccountInfo {
  email: string;
  accountType: AccountType;
  createdAt: string;
  lastActivityAt: string;
  lastIp: string | null;
  ipLogs: IpLogEntry[];
  consents: {
    termsVersion: string | null;
    termsAcceptedDate: string | null;
    gdprConsentDate: string | null;
    currentVersion: string;
    upToDate: boolean;
  };
}
