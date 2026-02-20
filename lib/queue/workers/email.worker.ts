/**
 * Email Worker
 *
 * Processes email jobs from the queue and sends them via SendGrid.
 * IMPORTANT: ALL emails in AlteaPay MUST go through this queue.
 * ASAAS should NEVER send emails (emailNotificationEnabled: false).
 */

import { Worker, Job } from "bullmq"
import { QUEUE_NAMES, getWorkerOptions, type EmailJobData, type EmailJobResult } from "../config"
import { createAdminClient } from "@/lib/supabase/server"

// SendGrid configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@alteapay.com"
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || "AlteaPay"
const SENDGRID_REPLY_TO = process.env.SENDGRID_REPLY_TO || "suporte@alteapay.com"

/**
 * Send email via SendGrid API
 */
async function sendEmailViaSendGrid(data: EmailJobData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY not configured")
  }

  const fromEmail = data.from || SENDGRID_FROM_EMAIL
  const fromName = data.fromName || SENDGRID_FROM_NAME

  const payload = {
    personalizations: [
      {
        to: [{ email: data.to }],
        subject: data.subject,
      },
    ],
    from: {
      email: fromEmail,
      name: fromName,
    },
    reply_to: {
      email: data.replyTo || SENDGRID_REPLY_TO,
    },
    content: [
      ...(data.text ? [{ type: "text/plain", value: data.text }] : []),
      { type: "text/html", value: data.html },
    ],
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`SendGrid error ${response.status}: ${errorBody}`)
  }

  // SendGrid returns message ID in header
  const messageId = response.headers.get("x-message-id") || undefined

  return { success: true, messageId }
}

/**
 * Log email to database
 */
async function logEmailToDatabase(
  job: Job<EmailJobData>,
  result: EmailJobResult
): Promise<void> {
  try {
    const supabase = createAdminClient()

    await supabase.from("queue_logs").insert({
      queue_name: QUEUE_NAMES.EMAIL,
      job_id: job.id,
      job_name: job.name,
      status: result.success ? "completed" : "failed",
      data: {
        to: job.data.to,
        subject: job.data.subject,
        metadata: job.data.metadata,
      },
      result: {
        messageId: result.messageId,
        error: result.error,
      },
      attempts: job.attemptsMade,
      processed_at: new Date().toISOString(),
    })
  } catch (dbError: any) {
    console.error("[EmailWorker] Failed to log to database:", dbError.message)
    // Don't throw - logging failure shouldn't fail the job
  }
}

/**
 * Process an email job
 */
async function processEmailJob(job: Job<EmailJobData>): Promise<EmailJobResult> {
  const startTime = Date.now()

  console.log(`[EmailWorker] Processing job ${job.id}: ${job.data.to}`)

  try {
    // Validate email data
    if (!job.data.to || !job.data.subject || !job.data.html) {
      throw new Error("Missing required email fields: to, subject, or html")
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(job.data.to)) {
      throw new Error(`Invalid email address: ${job.data.to}`)
    }

    // Send via SendGrid
    const sendResult = await sendEmailViaSendGrid(job.data)

    const result: EmailJobResult = {
      success: true,
      messageId: sendResult.messageId,
      timestamp: new Date().toISOString(),
    }

    // Log to database
    await logEmailToDatabase(job, result)

    const duration = Date.now() - startTime
    console.log(`[EmailWorker] Job ${job.id} completed in ${duration}ms. MessageId: ${sendResult.messageId}`)

    return result
  } catch (error: any) {
    const result: EmailJobResult = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }

    // Log failure to database
    await logEmailToDatabase(job, result)

    console.error(`[EmailWorker] Job ${job.id} failed:`, error.message)
    throw error // Rethrow to trigger retry
  }
}

/**
 * Create and start the email worker
 */
export function createEmailWorker(): Worker<EmailJobData, EmailJobResult> {
  const worker = new Worker<EmailJobData, EmailJobResult>(
    QUEUE_NAMES.EMAIL,
    processEmailJob,
    getWorkerOptions(QUEUE_NAMES.EMAIL)
  )

  worker.on("completed", (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed successfully`)
  })

  worker.on("failed", (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message)
  })

  worker.on("error", (err) => {
    console.error("[EmailWorker] Worker error:", err.message)
  })

  worker.on("stalled", (jobId) => {
    console.warn(`[EmailWorker] Job ${jobId} stalled`)
  })

  console.log("[EmailWorker] Worker started")
  return worker
}

// Export for direct import when running worker process
export { processEmailJob }
