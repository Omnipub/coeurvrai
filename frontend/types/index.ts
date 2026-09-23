export type AccountType = 'homme' | 'femme_trans';

export interface AuthUser {
  id: string;
  email: string;
  accountType: AccountType;
  role: 'user' | 'moderator' | 'admin';
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
}

export interface MatchSummary {
  matchId: string;
  createdAt: string;
  user: { id: string; displayName: string; photo: string | null };
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
