import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sans SMTP_URL (développement, tests), les e-mails ne sont pas envoyés :
 * ils sont conservés dans `outbox` et le texte est affiché dans la console
 * (sauf en test), ce qui permet de cliquer sur les liens en local.
 */
export const outbox: MailMessage[] = [];

const transport: Transporter = config.smtpUrl
  ? nodemailer.createTransport(config.smtpUrl)
  : nodemailer.createTransport({ jsonTransport: true });

export async function sendMail(message: MailMessage): Promise<void> {
  await transport.sendMail({ from: config.mailFrom, ...message });
  if (!config.smtpUrl) {
    outbox.push(message);
    // Affichage en clair réservé au développement local (jamais en production).
    if (config.env === 'development' || config.isStaging) {
      console.info(`[mail] (non envoyé, SMTP_URL vide) à ${message.to} — ${message.subject}\n${message.text}`);
    } else if (config.env === 'production') {
      logger.warn('mail.not_sent', { reason: 'SMTP_URL vide' });
    }
  }
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
