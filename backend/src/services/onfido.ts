import { Configuration, DefaultApi, Region, WebhookEventVerifier } from '@onfido/api';
import type { WebhookEvent } from '@onfido/api';
import { config } from '../utils/config';
import { OnfidoStatus } from '../models/types';

/**
 * Accès à Onfido (vérification d'identité par selfie via un workflow Studio).
 *
 * Minimisation des données : l'« applicant » Onfido est créé avec un nom
 * générique — nous n'envoyons ni nom civil, ni e-mail, ni date de naissance.
 * Seuls les identifiants Onfido et le statut du contrôle sont stockés chez nous.
 */
export interface OnfidoClient {
  createApplicant(): Promise<{ id: string }>;
  createWorkflowRun(applicantId: string): Promise<{ id: string; sdkToken: string; status: OnfidoStatus }>;
  findWorkflowRun(id: string): Promise<{ id: string; applicantId: string; status: OnfidoStatus }>;
  deleteApplicant(id: string): Promise<void>;
}

function createClient(): OnfidoClient {
  const api = new DefaultApi(
    new Configuration({
      apiToken: config.onfido.apiToken,
      region: Region[config.onfido.region] ?? Region.EU,
      baseOptions: { timeout: 30_000 },
    }),
  );

  return {
    async createApplicant() {
      const { data } = await api.createApplicant({ first_name: 'Membre', last_name: 'coeur-vrai' });
      return { id: data.id };
    },
    async createWorkflowRun(applicantId) {
      const { data } = await api.createWorkflowRun({
        workflow_id: config.onfido.workflowId,
        applicant_id: applicantId,
      });
      if (!data.sdk_token) throw new Error('Onfido n’a pas renvoyé de jeton SDK');
      return { id: data.id, sdkToken: data.sdk_token, status: (data.status ?? 'awaiting_input') as OnfidoStatus };
    },
    async findWorkflowRun(id) {
      const { data } = await api.findWorkflowRun(id);
      return { id: data.id, applicantId: data.applicant_id, status: data.status as OnfidoStatus };
    },
    async deleteApplicant(id) {
      await api.deleteApplicant(id);
    },
  };
}

let client: OnfidoClient | null =
  config.onfido.apiToken && config.onfido.workflowId ? createClient() : null;

/** Null si Onfido n'est pas configuré (ONFIDO_API_TOKEN / ONFIDO_WORKFLOW_ID). */
export function getOnfidoClient(): OnfidoClient | null {
  return client;
}

/** Remplace le client (tests). */
export function setOnfidoClient(next: OnfidoClient | null): void {
  client = next;
}

export class InvalidWebhookSignature extends Error {}

/** Vérifie la signature HMAC-SHA256 (en-tête X-SHA2-Signature) d'un webhook Onfido. */
export function readWebhook(rawBody: Buffer | undefined, signature: string | undefined): WebhookEvent {
  if (!config.onfido.webhookToken) throw new Error('ONFIDO_WEBHOOK_TOKEN non configuré');
  if (!rawBody || !signature || !/^[0-9a-f]{64}$/i.test(signature)) {
    throw new InvalidWebhookSignature();
  }
  try {
    return new WebhookEventVerifier(config.onfido.webhookToken).readPayload(rawBody, signature);
  } catch {
    throw new InvalidWebhookSignature();
  }
}

/** Suppression de l'applicant chez Onfido (RGPD), sans bloquer en cas d'échec. */
export async function deleteOnfidoApplicants(ids: (string | null)[]): Promise<void> {
  const onfido = getOnfidoClient();
  if (!onfido) return;
  await Promise.all(
    ids
      .filter((id): id is string => Boolean(id))
      .map((id) =>
        onfido.deleteApplicant(id).catch((err) => console.error('[onfido] suppression applicant', id, err)),
      ),
  );
}
