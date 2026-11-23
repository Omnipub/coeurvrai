-- 0003 — Chiffrement applicatif (AES-256-GCM) de champs sensibles.
-- Le texte chiffré est plus long que le texte d'origine : les limites de longueur
-- sont désormais vérifiées par l'application (2 000 caractères en clair), la base
-- ne garde qu'un plafond de sécurité.
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE messages ADD CONSTRAINT messages_content_len CHECK (char_length(content) BETWEEN 1 AND 16000);

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_details_check;
ALTER TABLE reports ADD CONSTRAINT reports_details_len CHECK (char_length(details) <= 16000);

-- Empreinte (HMAC) de la dernière IP : permet de savoir si l'IP a changé sans la déchiffrer.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ip_hmac TEXT;
