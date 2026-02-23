import { Worker, Job } from 'bullmq';
import { connection } from '../connection';
import { QUEUE_CONFIG } from '../config';
import {
  asaasRequest,
  incrementBatchCompleted,
  incrementBatchFailed,
  checkAndFinalizeBatch,
  startBatchProcessing,
  getSupabaseAdmin,
} from './asaas-api';

export interface AsaasChargeCancelJobData {
  batchId: string;
  jobIndex: number;
  // ASAAS payment ID
  asaasPaymentId: string;
  // Supabase tracking
  agreementId?: string;
  debtId?: string;
  companyId?: string;
  // Reason for cancellation
  reason?: string;
}

export const asaasChargeCancelWorker = new Worker<AsaasChargeCancelJobData>(
  QUEUE_CONFIG.asaasChargeCancel.name,
  async (job: Job<AsaasChargeCancelJobData>) => {
    const { batchId, jobIndex, asaasPaymentId, agreementId, debtId, reason } = job.data;

    console.log(`[ASAAS-CANCEL] Processing job ${job.id} (batch: ${batchId}, index: ${jobIndex})`);
    console.log(`[ASAAS-CANCEL] Cancelling payment: ${asaasPaymentId}`);

    // Mark batch as processing on first job
    if (jobIndex === 0) {
      await startBatchProcessing(batchId);
    }

    try {
      // Cancel payment in ASAAS
      const result = await asaasRequest(`/payments/${asaasPaymentId}`, 'DELETE');

      if (!result.success) {
        // Check if already cancelled or deleted
        if (result.error?.includes('already') || result.error?.includes('deleted')) {
          console.log(`[ASAAS-CANCEL] Payment ${asaasPaymentId} already cancelled/deleted`);
        } else {
          throw new Error(`ASAAS error: ${result.error}`);
        }
      }

      console.log(`[ASAAS-CANCEL] Payment ${asaasPaymentId} cancelled successfully`);

      // Update Supabase records
      const supabase = getSupabaseAdmin();

      if (agreementId) {
        await (supabase as any)
          .from('agreements')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason || 'Batch cancellation',
            updated_at: new Date().toISOString(),
          })
          .eq('id', agreementId);
      }

      if (debtId) {
        await (supabase as any)
          .from('debts')
          .update({
            status: 'open', // Revert to open when agreement is cancelled
            updated_at: new Date().toISOString(),
          })
          .eq('id', debtId);
      }

      // Track batch completion
      const resultData = {
        jobIndex,
        paymentId: asaasPaymentId,
        agreementId,
        debtId,
        cancelled: true,
      };

      await incrementBatchCompleted(batchId, resultData);

      // Check if batch is complete
      const { isComplete, finalStatus } = await checkAndFinalizeBatch(batchId);
      if (isComplete) {
        console.log(`[ASAAS-CANCEL] Batch ${batchId} completed with status: ${finalStatus}`);
      }

      return resultData;
    } catch (error: any) {
      console.error(`[ASAAS-CANCEL] Job ${job.id} failed: ${error.message}`);

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
        console.log(`[ASAAS-CANCEL] Batch ${batchId} completed with status: ${finalStatus}`);
      }

      throw error;
    }
  },
  {
    connection,
    concurrency: 3,
    limiter: QUEUE_CONFIG.asaasChargeCancel.limiter,
  }
);

asaasChargeCancelWorker.on('completed', (job, result) => {
  console.log(`[ASAAS-CANCEL] Job ${job.id} completed - Payment: ${result.paymentId}`);
});

asaasChargeCancelWorker.on('failed', (job, err) => {
  console.error(`[ASAAS-CANCEL] Job ${job?.id} failed permanently: ${err.message}`);
});

asaasChargeCancelWorker.on('error', (err) => {
  console.error('[ASAAS-CANCEL] Worker error:', err.message);
});
