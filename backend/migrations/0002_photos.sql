-- 0002 — Photos stockées dans un bucket S3 privé (OVH Object Storage / MinIO).
-- Chaque photo existe en deux versions : nette et floutée (générée à l'envoi).
-- La base ne contient que les clés des objets ; les URL sont signées à la demande,
-- avec une durée de vie courte, après vérification des droits.
CREATE TABLE IF NOT EXISTS photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position    SMALLINT NOT NULL CHECK (position BETWEEN 0 AND 5),
  storage_key TEXT NOT NULL UNIQUE,
  blur_key    TEXT NOT NULL UNIQUE,
  width       INTEGER NOT NULL,
  height      INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_user_position_idx ON photos (user_id, position);

-- Les anciennes colonnes contenaient des URL saisies à la main (avant l'envoi de fichiers).
ALTER TABLE profiles_homme DROP COLUMN IF EXISTS photos;
ALTER TABLE profiles_femme_trans DROP COLUMN IF EXISTS photos;
