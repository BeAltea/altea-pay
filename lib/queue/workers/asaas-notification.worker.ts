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

export interface AsaasNotificationJobData {
  batchId: string;
  jobIndex: number;
  // ASAAS payment ID
  asaasPaymentId: string;
  // Notification channels (ASAAS native)
  channels: {
    sms?: boolean;
    whatsapp?: boolean;
    email?: boolean; // Usually false, we use SendGrid
  };
  // Supabase tracking
  agreementId?: string;
  customerId?: string;
  companyId?: string;
}

export const asaasNotificationWorker = new Worker<AsaasNotificationJobData>(
  QUEUE_CONFIG.asaasNotification.name,
  async (job: Job<AsaasNotificationJobData>) => {
    const { batchId, jobIndex, asaasPaymentId, channels, agreementId, customerId } = job.data;

    console.log(`[ASAAS-NOTIFY] Processing job ${job.id} (batch: ${batchId}, index: ${jobIndex})`);
    console.log(`[ASAAS-NOTIFY] Sending notification for payment: ${asaasPaymentId}`);
    console.log(`[ASAAS-NOTIFY] Channels: SMS=${channels.sms}, WhatsApp=${channels.whatsapp}, Email=${channels.email}`);

    // Mark batch as processing on first job
    if (jobIndex === 0) {
      await startBatchProcessing(batchId);
    }

    try {
      // Get payment details first to verify it exists
      const paymentResult = await asaasRequest(`/payments/${asaasPaymentId}`);

      if (!paymentResult.success) {
        throw new Error(`Payment not found: ${paymentResult.error}`);
      }

      const payment = paymentResult.data;

      // Only send notifications for pending payments
      if (payment.status !== 'PENDING' && payment.status !== 'OVERDUE') {
        console.log(`[ASAAS-NOTIFY] Skipping notification - payment status is ${payment.status}`);

        const resultData = {
          jobIndex,
          paymentId: asaasPaymentId,
          skipped: true,
          reason: `Payment status: ${payment.status}`,
        };

        await incrementBatchCompleted(batchId, resultData);

        const { isComplete, finalStatus } = await checkAndFinalizeBatch(batchId);
        if (isComplete) {
          console.log(`[ASAAS-NOTIFY] Batch ${batchId} completed with status: ${finalStatus}`);
        }

        return resultData;
      }

      // Send notification via ASAAS
      // ASAAS API: POST /payments/{id}/resendNotification
      const notifyResult = await asaasRequest(
        `/payments/${asaasPaymentId}/resendNotification`,
        'POST'
      );

      if (!notifyResult.success) {
        throw new Error(`Notification error: ${notifyResult.error}`);
      }

      console.log(`[ASAAS-NOTIFY] Notification sent for payment ${asaasPaymentId}`);

      // Log notification in Supabase
      const supabase = getSupabaseAdmin();
      await (supabase as any).from('notification_logs').insert({
        type: 'asaas_notification',
        agreement_id: agreementId,
        customer_id: customerId,
        payment_id: asaasPaymentId,
        channels: channels,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      // Track batch completion
      const resultData = {
        jobIndex,
        paymentId: asaasPaymentId,
        agreementId,
        notified: true,
        channels: Object.keys(channels).filter((k) => channels[k as keyof typeof channels]),
      };

      await incrementBatchCompleted(batchId, resultData);

      // Check if batch is complete
      const { isComplete, finalStatus } = await checkAndFinalizeBatch(batchId);
      if (isComplete) {
        console.log(`[ASAAS-NOTIFY] Batch ${batchId} completed with status: ${finalStatus}`);
      }

      return resultData;
    } catch (error: any) {
      console.error(`[ASAAS-NOTIFY] Job ${job.id} failed: ${error.message}`);

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
        console.log(`[ASAAS-NOTIFY] Batch ${batchId} completed with status: ${finalStatus}`);
      }

      throw error;
    }
  },
  {
    connection,
    concurrency: 3,
    limiter: QUEUE_CONFIG.asaasNotification.limiter,
  }
);

asaasNotificationWorker.on('completed', (job, result) => {
  console.log(`[ASAAS-NOTIFY] Job ${job.id} completed - Payment: ${result.paymentId}`);
});

asaasNotificationWorker.on('failed', (job, err) => {
  console.error(`[ASAAS-NOTIFY] Job ${job?.id} failed permanently: ${err.message}`);
});

asaasNotificationWorker.on('error', (err) => {
  console.error('[ASAAS-NOTIFY] Worker error:', err.message);
});
