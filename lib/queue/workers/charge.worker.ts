/**
 * Charge Worker
 *
 * Processes charge creation jobs from the queue.
 * CRITICAL: Every ASAAS charge MUST have emailNotificationEnabled: false
 * AlteaPay handles all email notifications via the email queue.
 */

import { Worker, Job } from "bullmq"
import { QUEUE_NAMES, getWorkerOptions, type ChargeJobData, type ChargeJobResult } from "../config"
import { createAdminClient } from "@/lib/supabase/server"

// ASAAS configuration
const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

/**
 * Create a charge in ASAAS
 * CRITICAL: Always sets emailNotificationEnabled: false
 */
async function createAsaasCharge(data: ChargeJobData): Promise<{
  success: boolean
  paymentId?: string
  invoiceUrl?: string
  pixQrCodeUrl?: string
  bankSlipUrl?: string
  error?: string
}> {
  if (!ASAAS_API_KEY) {
    throw new Error("ASAAS_API_KEY not configured")
  }

  const payload: Record<string, any> = {
    customer: data.asaasCustomerId,
    billingType: data.billingType,
    value: data.value,
    dueDate: data.dueDate,
    description: data.description,
    externalReference: data.externalReference,
    postalService: false,
    // CRITICAL: ASAAS must NEVER send email notifications
    // AlteaPay handles ALL emails via SendGrid queue
    emailNotificationEnabled: false,
  }

  if (data.installmentCount && data.installmentValue) {
    payload.installmentCount = data.installmentCount
    payload.installmentValue = data.installmentValue
  }

  const response = await fetch(`${ASAAS_API_URL}/payments`, {
    method: "POST",
    headers: {
      access_token: ASAAS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const responseData = await response.json()

  if (!response.ok) {
    const errorMessage = responseData.errors?.[0]?.description || responseData.error || `ASAAS error ${response.status}`
    throw new Error(errorMessage)
  }

  return {
    success: true,
    paymentId: responseData.id,
    invoiceUrl: responseData.invoiceUrl,
    pixQrCodeUrl: responseData.pixQrCodeUrl,
    bankSlipUrl: responseData.bankSlipUrl,
  }
}

/**
 * Log charge to database
 */
async function logChargeToDatabase(
  job: Job<ChargeJobData>,
  result: ChargeJobResult
): Promise<void> {
  try {
    const supabase = createAdminClient()

    await supabase.from("queue_logs").insert({
      queue_name: QUEUE_NAMES.CHARGE,
      job_id: job.id,
      job_name: job.name,
      status: result.success ? "completed" : "failed",
      data: {
        customerId: job.data.customerId,
        asaasCustomerId: job.data.asaasCustomerId,
        billingType: job.data.billingType,
        value: job.data.value,
        dueDate: job.data.dueDate,
        metadata: job.data.metadata,
      },
      result: {
        asaasPaymentId: result.asaasPaymentId,
        invoiceUrl: result.invoiceUrl,
        error: result.error,
      },
      attempts: job.attemptsMade,
      processed_at: new Date().toISOString(),
    })
  } catch (dbError: any) {
    console.error("[ChargeWorker] Failed to log to database:", dbError.message)
  }
}

/**
 * Update agreement with ASAAS payment info
 */
async function updateAgreementWithPayment(
  agreementId: string,
  paymentData: {
    paymentId: string
    invoiceUrl?: string
    pixQrCodeUrl?: string
    bankSlipUrl?: string
  }
): Promise<void> {
  try {
    const supabase = createAdminClient()

    await supabase
      .from("agreements")
      .update({
        asaas_payment_id: paymentData.paymentId,
        asaas_payment_url: paymentData.invoiceUrl || null,
        asaas_pix_qrcode_url: paymentData.pixQrCodeUrl || null,
        asaas_boleto_url: paymentData.bankSlipUrl || null,
        status: "active",
      })
      .eq("id", agreementId)

    console.log(`[ChargeWorker] Agreement ${agreementId} updated with payment ${paymentData.paymentId}`)
  } catch (dbError: any) {
    console.error("[ChargeWorker] Failed to update agreement:", dbError.message)
    throw dbError // This should fail the job since it's critical
  }
}

/**
 * Process a charge job
 */
async function processChargeJob(job: Job<ChargeJobData>): Promise<ChargeJobResult> {
  const startTime = Date.now()

  console.log(`[ChargeWorker] Processing job ${job.id}: customer ${job.data.asaasCustomerId}`)

  try {
    // Validate charge data
    if (!job.data.asaasCustomerId || !job.data.value || !job.data.dueDate) {
      throw new Error("Missing required charge fields: asaasCustomerId, value, or dueDate")
    }

    if (job.data.value <= 0) {
      throw new Error(`Invalid charge value: ${job.data.value}`)
    }

    // Create charge in ASAAS (with emailNotificationEnabled: false)
    const chargeResult = await createAsaasCharge(job.data)

    // If we have an agreement ID, update it with payment info
    if (job.data.metadata?.agreementId && chargeResult.paymentId) {
      await updateAgreementWithPayment(job.data.metadata.agreementId, {
        paymentId: chargeResult.paymentId,
        invoiceUrl: chargeResult.invoiceUrl,
        pixQrCodeUrl: chargeResult.pixQrCodeUrl,
        bankSlipUrl: chargeResult.bankSlipUrl,
      })
    }

    const result: ChargeJobResult = {
      success: true,
      asaasPaymentId: chargeResult.paymentId,
      invoiceUrl: chargeResult.invoiceUrl,
      timestamp: new Date().toISOString(),
    }

    // Log to database
    await logChargeToDatabase(job, result)

    const duration = Date.now() - startTime
    console.log(`[ChargeWorker] Job ${job.id} completed in ${duration}ms. PaymentId: ${chargeResult.paymentId}`)

    return result
  } catch (error: any) {
    const result: ChargeJobResult = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }

    // Log failure to database
    await logChargeToDatabase(job, result)

    console.error(`[ChargeWorker] Job ${job.id} failed:`, error.message)
    throw error // Rethrow to trigger retry
  }
}

/**
 * Create and start the charge worker
 */
export function createChargeWorker(): Worker<ChargeJobData, ChargeJobResult> {
  const worker = new Worker<ChargeJobData, ChargeJobResult>(
    QUEUE_NAMES.CHARGE,
    processChargeJob,
    getWorkerOptions(QUEUE_NAMES.CHARGE)
  )

  worker.on("completed", (job) => {
    console.log(`[ChargeWorker] Job ${job.id} completed successfully`)
  })

  worker.on("failed", (job, err) => {
    console.error(`[ChargeWorker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message)
  })

  worker.on("error", (err) => {
    console.error("[ChargeWorker] Worker error:", err.message)
  })

  worker.on("stalled", (jobId) => {
    console.warn(`[ChargeWorker] Job ${jobId} stalled`)
  })

  console.log("[ChargeWorker] Worker started")
  return worker
}

// Export for direct import when running worker process
export { processChargeJob }
