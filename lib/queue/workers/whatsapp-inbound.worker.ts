import { Job } from 'bullmq';
import { WorkerManager } from '../worker-manager';
import { QUEUE_CONFIG } from '../config';
import { sendText } from '../../notifications/whatsapp-cloud';

/**
 * WhatsApp inbound worker (roadmap-v1 WS-5).
 *
 * Consome `alteapay-whatsapp-inbound` (Contrato B), repassa a mensagem ao
 * `negotiation-agent` (Contrato A — POST /chat) e devolve a resposta ao cliente
 * via WhatsApp Cloud API (sendText).
 *
 * Concorrência = 1: um único modelo Ollama carregado por vez (ver
 * docs/contratos-roadmap-v1.md, seção LLM). Chamadas ao agente são serializadas.
 */
export interface WhatsAppInboundJobData {
  wa_message_id: string;
  from: string;       // E.164 sem +
  text: string;
  company_id: string; // derivado server-side pelo webhook
  received_at: string;
  thread_id: string;
}

function negotiationAgentBaseUrl(): string {
  return (
    process.env.NEGOTIATION_AGENT_URL ||
    'http://negotiation-agent.alteapay-negotiation.svc.cluster.local'
  ).replace(/\/+$/, '');
}

async function callNegotiationAgent(data: WhatsAppInboundJobData): Promise<{ reply?: string; state?: any }> {
  const url = `${negotiationAgentBaseUrl()}/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thread_id: data.thread_id,
      message: data.text,
      source: 'live',
      company_id: data.company_id,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`negotiation-agent /chat ${res.status}: ${body.slice(0, 500)}`);
  }
  return res.json();
}

export const whatsappInboundWorker = WorkerManager.registerWorker<WhatsAppInboundJobData>(
  QUEUE_CONFIG.whatsappInbound.name,
  async (job: Job<WhatsAppInboundJobData>) => {
    const { from, text, company_id, thread_id, wa_message_id } = job.data;
    console.log(`[WA-INBOUND] Job ${job.id} msg=${wa_message_id} thread=${thread_id}`);

    // Sem company_id não há como rotear para o tenant — não reprocessar à toa.
    if (!company_id) {
      console.warn(`[WA-INBOUND] Sem company_id (msg=${wa_message_id}); ignorando.`);
      return { skipped: 'no-company' };
    }
    if (!from || !text) {
      console.warn(`[WA-INBOUND] Mensagem sem from/text (msg=${wa_message_id}); ignorando.`);
      return { skipped: 'empty' };
    }

    const { reply } = await callNegotiationAgent(job.data);

    if (reply && reply.trim()) {
      await sendText(from, reply); // Contrato A -> resposta ao cliente via Cloud API
      console.log(`[WA-INBOUND] Resposta enviada a ${from} (msg=${wa_message_id})`);
      return { replied: true };
    }

    console.warn(`[WA-INBOUND] Agente não retornou reply (msg=${wa_message_id}).`);
    return { replied: false };
  },
  {
    // 1 req em voo: serializa chamadas ao Ollama (RAM/modelo único).
    concurrency: 1,
  }
);

whatsappInboundWorker.on('completed', (job) => {
  console.log(`[WA-INBOUND] Job ${job.id} completed`);
});

whatsappInboundWorker.on('failed', (job, err) => {
  console.error(`[WA-INBOUND] Job ${job?.id} failed: ${err.message}`);
});

whatsappInboundWorker.on('error', (err) => {
  console.error('[WA-INBOUND] Worker error:', err.message);
});
