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
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  resolved_at     TIMESTAMPTZ,
  CHECK (reporter_id <> reported_id)
);
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
