import crypto from 'crypto';
import { pool } from '../utils/db';
import { config } from '../utils/config';
import { escapeHtml, sendMail } from './mailer';

/** Durée de validité d'un lien de vérification. */
export const EMAIL_TOKEN_TTL = '24 hours';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Génère un nouveau lien de vérification (valable 24 h) et l'envoie par e-mail.
 * Seule l'empreinte SHA-256 du jeton est stockée ; un nouvel envoi invalide le précédent.
 */
export async function sendVerificationEmail(userId: string, email: string): Promise<void> {
  const token = crypto.randomBytes(32).toString('base64url');
  await pool.query(
    `UPDATE users
        SET email_verification_token_hash = $2,
            email_verification_expires_at = now() + INTERVAL '${EMAIL_TOKEN_TTL}'
      WHERE id = $1`,
    [userId, hashToken(token)],
  );

  const link = `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: email,
    subject: 'Confirmez votre adresse e-mail — Cœur Vrai',
    text: [
      'Bonjour,',
      '',
      'Pour confirmer votre adresse e-mail sur Cœur Vrai, ouvrez ce lien (valable 24 heures) :',
      link,
      '',
      'Si vous n’êtes pas à l’origine de cette inscription, ignorez simplement ce message.',
      '',
      'L’équipe Cœur Vrai',
    ].join('\n'),
    html: `<p>Bonjour,</p>
<p>Pour confirmer votre adresse e-mail sur Cœur Vrai, cliquez sur le bouton ci-dessous (lien valable 24&nbsp;heures).</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#e11d48;color:#fff;text-decoration:none">Confirmer mon adresse</a></p>
<p style="color:#666;font-size:13px">Ou copiez ce lien : ${escapeHtml(link)}</p>
<p style="color:#666;font-size:13px">Si vous n’êtes pas à l’origine de cette inscription, ignorez simplement ce message.</p>`,
  });
}

/** Valide un jeton. Retourne l'id du compte vérifié, ou null si le lien est invalide ou expiré. */
export async function verifyEmailToken(token: string): Promise<string | null> {
  const { rows } = await pool.query<{ id: string }>(
    `UPDATE users
        SET email_verified = true,
            email_verified_at = now(),
            email_verification_token_hash = NULL,
            email_verification_expires_at = NULL,
            updated_at = now()
      WHERE email_verification_token_hash = $1
        AND email_verification_expires_at > now()
      RETURNING id`,
    [hashToken(token)],
  );
  return rows[0]?.id ?? null;
}
