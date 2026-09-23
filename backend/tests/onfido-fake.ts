import crypto from 'crypto';
import type { OnfidoClient } from '../src/services/onfido';
import type { OnfidoStatus } from '../src/models/types';

/** Faux client Onfido en mémoire : simule applicants et workflow runs. */
export class FakeOnfido implements OnfidoClient {
  applicants = new Set<string>();
  deletedApplicants: string[] = [];
  runs = new Map<string, { id: string; applicantId: string; status: OnfidoStatus }>();
  private seq = 0;

  async createApplicant() {
    const id = `applicant_${++this.seq}`;
    this.applicants.add(id);
    return { id };
  }

  async createWorkflowRun(applicantId: string) {
    if (!this.applicants.has(applicantId)) throw new Error('applicant inconnu');
    const run = { id: `run_${++this.seq}`, applicantId, status: 'awaiting_input' as OnfidoStatus };
    this.runs.set(run.id, run);
    return { ...run, sdkToken: `sdk_token_for_${run.id}` };
  }

  async findWorkflowRun(id: string) {
    const run = this.runs.get(id);
    if (!run) throw new Error('404 workflow run');
    return run;
  }

  async deleteApplicant(id: string) {
    this.applicants.delete(id);
    this.deletedApplicants.push(id);
  }

  /** Simule la fin du contrôle côté Onfido. */
  complete(runId: string, status: OnfidoStatus) {
    this.runs.get(runId)!.status = status;
  }
}

/** Corps + signature d'un webhook `workflow_run.completed`, signé comme Onfido. */
export function signedWebhook(runId: string, status: OnfidoStatus, token = 'test-webhook-token') {
  const body = JSON.stringify({
    payload: {
      resource_type: 'workflow_run',
      action: 'workflow_run.completed',
      object: { id: runId, status, completed_at_iso8601: new Date().toISOString(), href: `https://api.eu.onfido.com/v3.6/workflow_runs/${runId}` },
    },
  });
  const signature = crypto.createHmac('sha256', token).update(body).digest('hex');
  return { body, signature };
}
