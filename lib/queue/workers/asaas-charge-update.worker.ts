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

export interface AsaasChargeUpdateJobData {
  batchId: string;
  jobIndex: number;
  // ASAAS payment ID
  asaasPaymentId: string;
  // Fields to update
  update: {
    value?: number;
    dueDate?: string;
    description?: string;
    billingType?: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';
  };
  // Supabase tracking
  agreementId?: string;
  companyId?: string;
}

export const asaasChargeUpdateWorker = new Worker<AsaasChargeUpdateJobData>(
  QUEUE_CONFIG.asaasChargeUpdate.name,
  async (job: Job<AsaasChargeUpdateJobData>) => {
    const { batchId, jobIndex, asaasPaymentId, update, agreementId } = job.data;

    console.log(`[ASAAS-UPDATE] Processing job ${job.id} (batch: ${batchId}, index: ${jobIndex})`);
    console.log(`[ASAAS-UPDATE] Updating payment: ${asaasPaymentId}`);

    // Mark batch as processing on first job
    if (jobIndex === 0) {
      await startBatchProcessing(batchId);
    }

    try {
      // Update payment in ASAAS
      const updateData = Object.fromEntries(
        Object.entries(update).filter(([_, v]) => v !== undefined && v !== null)
      );

      if (Object.keys(updateData).length === 0) {
        throw new Error('No fields to update');
      }

      const result = await asaasRequest(`/payments/${asaasPaymentId}`, 'PUT', updateData);

      if (!result.success) {
        throw new Error(`ASAAS error: ${result.error}`);
      }

      console.log(`[ASAAS-UPDATE] Payment ${asaasPaymentId} updated successfully`);

      // Update Supabase if agreement exists
      if (agreementId) {
        const supabase = getSupabaseAdmin();
        const supabaseUpdate: Record<string, any> = { updated_at: new Date().toISOString() };

        if (update.value) supabaseUpdate.value = update.value;
        if (update.dueDate) supabaseUpdate.due_date = update.dueDate;

        await (supabase as any)
          .from('agreements')
          .update(supabaseUpdate)
          .eq('id', agreementId);
      }

      // Track batch completion
      const resultData = {
        jobIndex,
        paymentId: asaasPaymentId,
        agreementId,
        updated: Object.keys(updateData),
      };

      await incrementBatchCompleted(batchId, resultData);

      // Check if batch is complete
      const { isComplete, finalStatus } = await checkAndFinalizeBatch(batchId);
      if (isComplete) {
        console.log(`[ASAAS-UPDATE] Batch ${batchId} completed with status: ${finalStatus}`);
      }

      return resultData;
    } catch (error: any) {
      console.error(`[ASAAS-UPDATE] Job ${job.id} failed: ${error.message}`);

      // Track batch failure
      await incrementBatchFailed(batchId, {
        jobIndex,
        paymentId: asaasPaymentId,
        agreementId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // Check if batch is complete
      const { isComplete, finalStatus } = await checkAndFinalizeBatch(batchId);
      if (isComplete) {
        console.log(`[ASAAS-UPDATE] Batch ${batchId} completed with status: ${finalStatus}`);
      }

      throw error;
    }
  },
  {
    connection,
    concurrency: 3,
    limiter: QUEUE_CONFIG.asaasChargeUpdate.limiter,
  }
);

asaasChargeUpdateWorker.on('completed', (job, result) => {
  console.log(`[ASAAS-UPDATE] Job ${job.id} completed - Payment: ${result.paymentId}`);
});

asaasChargeUpdateWorker.on('failed', (job, err) => {
  console.error(`[ASAAS-UPDATE] Job ${job?.id} failed permanently: ${err.message}`);
});

asaasChargeUpdateWorker.on('error', (err) => {
  console.error('[ASAAS-UPDATE] Worker error:', err.message);
});
