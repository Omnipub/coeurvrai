/**
 * Schéma PostgreSQL 15 de coeur-vrai.com.
 *
 * Idempotent : peut être rejoué sans erreur (`npm run db:migrate`).
 * Tables : users, profiles_homme, profiles_femme_trans, likes, matches,
 * messages, reports, blocks.
 */
export const schema = /* sql */ `
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------- Users
CREATE TABLE IF NOT EXISTS users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email              CITEXT NOT NULL UNIQUE,
  password_hash      TEXT NOT NULL,
  account_type       TEXT NOT NULL CHECK (account_type IN ('homme', 'femme_trans')),
  birthdate          DATE NOT NULL CHECK (birthdate <= CURRENT_DATE - INTERVAL '18 years'),
  role               TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  stripe_customer_id TEXT UNIQUE,
  -- Preuves de consentement (CGU + charte, et RGPD art. 9) horodatées à l'inscription.
  terms_accepted_date TIMESTAMPTZ,
  terms_version       TEXT,
  gdpr_consent_date   TIMESTAMPTZ,
  -- Activité et données de connexion (conservées 1 an, purgées par jobs/cleanup.ts).
  last_activity_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_ip               TEXT,
  ip_logs               JSONB NOT NULL DEFAULT '[]', -- [{ "ip": "…", "date": "ISO 8601" }]
  inactivity_warned_at  TIMESTAMPTZ,                 -- préavis avant suppression pour inactivité
  -- Vérification de l'adresse e-mail (jeton stocké haché, valable 24 h).
  email_verified                BOOLEAN NOT NULL DEFAULT false,
  email_verified_at             TIMESTAMPTZ,
  email_verification_token_hash TEXT UNIQUE,
  email_verification_expires_at TIMESTAMPTZ,
  -- Vérification d'identité Onfido (facultative) : seul le statut est conservé ici.
  onfido_applicant_id  TEXT UNIQUE,
  onfido_check_id      TEXT UNIQUE,  -- identifiant du workflow run Onfido Studio
  onfido_check_status  TEXT,         -- awaiting_input | processing | approved | declined | review | abandoned | error
  onfido_consent_at    TIMESTAMPTZ,  -- consentement explicite (données biométriques, RGPD art. 9)
  onfido_checked_at    TIMESTAMPTZ,
  verified_badge BOOLEAN GENERATED ALWAYS AS (email_verified AND onfido_check_status IS NOT DISTINCT FROM 'approved') STORED,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration des bases créées avant l'ajout des consentements.
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_date TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gdpr_consent_date TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ip TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ip_logs JSONB NOT NULL DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS inactivity_warned_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS users_last_activity_idx ON users (last_activity_at);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onfido_applicant_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onfido_check_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onfido_check_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onfido_consent_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onfido_checked_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_badge BOOLEAN
  GENERATED ALWAYS AS (email_verified AND onfido_check_status IS NOT DISTINCT FROM 'approved') STORED;

-- ------------------------------------------------------- ProfileHomme
CREATE TABLE IF NOT EXISTS profiles_homme (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 40),
  bio          TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 1000),
  city         TEXT,
  photos       TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(photos) <= 6),
  height_cm    SMALLINT CHECK (height_cm BETWEEN 120 AND 230),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------- ProfileFemmeTrans
CREATE TABLE IF NOT EXISTS profiles_femme_trans (
  user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name        TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 40),
  bio                 TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 1000),
  city                TEXT,
  photos              TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(photos) <= 6),
  pronouns            TEXT CHECK (char_length(pronouns) <= 30),
  photos_matches_only BOOLEAN NOT NULL DEFAULT false,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- Like
CREATE TABLE IF NOT EXISTS likes (
  liker_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liked_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (liker_id, liked_id),
  CHECK (liker_id <> liked_id)
);
CREATE INDEX IF NOT EXISTS likes_liked_idx ON likes (liked_id);

-- --------------------------------------------------------------- Match
-- Paire ordonnée (user_a < user_b) pour garantir l'unicité d'un match.
CREATE TABLE IF NOT EXISTS matches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  unmatched_at TIMESTAMPTZ,
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);
CREATE INDEX IF NOT EXISTS matches_user_b_idx ON matches (user_b);

-- ------------------------------------------------------------- Message
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS messages_match_created_idx ON messages (match_id, created_at DESC);

-- -------------------------------------------------------------- Report
CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id      UUID REFERENCES messages(id) ON DELETE SET NULL,
  reason          TEXT NOT NULL CHECK (reason IN (
                    'harcelement', 'transphobie', 'faux_profil',
                    'contenu_inapproprie', 'arnaque', 'mineur', 'autre')),
  details         TEXT CHECK (char_length(details) <= 2000),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  moderator_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at       TIMESTAMPTZ, -- date de clôture (resolved / dismissed), purge à 1 an
  CHECK (reporter_id <> reported_id)
);
-- Migration : resolved_at → closed_at.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'reports' AND column_name = 'resolved_at') THEN
    UPDATE reports SET closed_at = resolved_at WHERE closed_at IS NULL;
    ALTER TABLE reports DROP COLUMN resolved_at;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS reports_closed_idx ON reports (closed_at) WHERE closed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status, created_at);
CREATE INDEX IF NOT EXISTS reports_reported_idx ON reports (reported_id);

-- --------------------------------------------------------------- Block
-- Un blocage masque les profils dans les deux sens et coupe le chat.
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
`;
