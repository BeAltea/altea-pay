import { Job } from 'bullmq';
import { WorkerManager } from '../worker-manager';
import { QUEUE_CONFIG } from '../config';
import {
  asaasRequest,
  incrementBatchCompleted,
  incrementBatchFailed,
  checkAndFinalizeBatch,
  startBatchProcessing,
  getSupabaseAdmin,
} from './asaas-api';

export interface AsaasSyncJobData {
  batchId: string;
  jobIndex: number;
  // ASAAS payment ID
  asaasPaymentId: string;
  // Supabase tracking
  agreementId: string;
  debtId?: string;
  companyId?: string;
}

// Map ASAAS status to Supabase agreement status
function mapAsaasStatusToAgreement(asaasStatus: string): string {
  const statusMap: Record<string, string> = {
    PENDING: 'pending',
    RECEIVED: 'paid',
    CONFIRMED: 'paid',
    RECEIVED_IN_CASH: 'paid',
    OVERDUE: 'overdue',
    REFUND_REQUESTED: 'refund_requested',
    REFUNDED: 'refunded',
    CHARGEBACK_REQUESTED: 'chargeback_requested',
    CHARGEBACK_DISPUTE: 'chargeback_dispute',
    AWAITING_CHARGEBACK_REVERSAL: 'chargeback_dispute',
    DUNNING_REQUESTED: 'dunning',
    DUNNING_RECEIVED: 'dunning',
    AWAITING_RISK_ANALYSIS: 'pending',
  };

  return statusMap[asaasStatus] || 'unknown';
}

// Map ASAAS status to Supabase debt status
function mapAsaasStatusToDebt(asaasStatus: string): string {
  const statusMap: Record<string, string> = {
    PENDING: 'in_agreement',
    RECEIVED: 'paid',
    CONFIRMED: 'paid',
    RECEIVED_IN_CASH: 'paid',
    OVERDUE: 'in_agreement',
    REFUND_REQUESTED: 'open',
    REFUNDED: 'open',
    CHARGEBACK_REQUESTED: 'open',
    CHARGEBACK_DISPUTE: 'open',
    AWAITING_CHARGEBACK_REVERSAL: 'open',
    DUNNING_REQUESTED: 'in_agreement',
    DUNNING_RECEIVED: 'in_agreement',
    AWAITING_RISK_ANALYSIS: 'in_agreement',
  };

  return statusMap[asaasStatus] || 'open';
}

export const asaasSyncWorker = WorkerManager.registerWorker<AsaasSyncJobData>(
  QUEUE_CONFIG.asaasSync.name,
  async (job: Job<AsaasSyncJobData>) => {
    const { batchId, jobIndex, asaasPaymentId, agreementId, debtId } = job.data;

    console.log(`[ASAAS-SYNC] Processing job ${job.id} (batch: ${batchId}, index: ${jobIndex})`);
    console.log(`[ASAAS-SYNC] Syncing payment: ${asaasPaymentId}`);

    // Mark batch as processing on first job
    if (jobIndex === 0) {
      await startBatchProcessing(batchId);
    }

    try {
      // Fetch payment status from ASAAS
      const paymentResult = await asaasRequest(`/payments/${asaasPaymentId}`);

      if (!paymentResult.success) {
        throw new Error(`Payment not found: ${paymentResult.error}`);
      }

      const payment = paymentResult.data;
      console.log(`[ASAAS-SYNC] ASAAS status: ${payment.status}`);

      // Update Supabase records
      const supabase = getSupabaseAdmin();

      const agreementStatus = mapAsaasStatusToAgreement(payment.status);
      const agreementUpdate: Record<string, any> = {
        status: agreementStatus,
        asaas_status: payment.status,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      };

      // Add payment-specific data if available
      if (payment.confirmedDate) {
        agreementUpdate.paid_at = payment.confirmedDate;
      }
      if (payment.paymentDate) {
        agreementUpdate.payment_date = payment.paymentDate;
      }
      if (payment.netValue !== undefined) {
        agreementUpdate.net_value = payment.netValue;
      }

      await (supabase as any)
        .from('agreements')
        .update(agreementUpdate)
        .eq('id', agreementId);

      // Update debt if exists
      if (debtId) {
        const debtStatus = mapAsaasStatusToDebt(payment.status);
        const debtUpdate: Record<string, any> = {
          status: debtStatus,
          updated_at: new Date().toISOString(),
        };

        if (payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
          debtUpdate.paid_at = payment.confirmedDate || new Date().toISOString();
        }

        await (supabase as any)
          .from('debts')
          .update(debtUpdate)
          .eq('id', debtId);
      }

      console.log(`[ASAAS-SYNC] Agreement ${agreementId} synced: ${agreementStatus}`);

      // Track batch completion
      const resultData = {
        jobIndex,
        paymentId: asaasPaymentId,
        agreementId,
        debtId,
        asaasStatus: payment.status,
        localStatus: agreementStatus,
        synced: true,
      };

      await incrementBatchCompleted(batchId, resultData);

      // Check if batch is complete
      const { isComplete, finalStatus } = await checkAndFinalizeBatch(batchId);
      if (isComplete) {
        console.log(`[ASAAS-SYNC] Batch ${batchId} completed with status: ${finalStatus}`);
      }

      return resultData;
    } catch (error: any) {
      console.error(`[ASAAS-SYNC] Job ${job.id} failed: ${error.message}`);

      // Track batch failure
      await incrementBatchFailed(batchId, {
        jobIndex,
        paymentId: asaasPaymentId,
        agreementId,
        debtId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // Check if batch is complete
      const { isComplete, finalStatus } = await checkAndFinalizeBatch(batchId);
      if (isComplete) {
        console.log(`[ASAAS-SYNC] Batch ${batchId} completed with status: ${finalStatus}`);
      }

      throw error;
    }
  },
  {
    concurrency: 5, // Higher concurrency for sync since it's mostly read operations
    limiter: QUEUE_CONFIG.asaasSync.limiter,
  }
);

asaasSyncWorker.on('completed', (job, result) => {
  console.log(`[ASAAS-SYNC] Job ${job.id} completed - Status: ${result.asaasStatus}`);
});

asaasSyncWorker.on('failed', (job, err) => {
  console.error(`[ASAAS-SYNC] Job ${job?.id} failed permanently: ${err.message}`);
});

asaasSyncWorker.on('error', (err) => {
  console.error('[ASAAS-SYNC] Worker error:', err.message);
});
