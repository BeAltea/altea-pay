/**
 * Queue Instances
 *
 * Singleton queue instances for email, charge, and notification processing.
 */

import { Queue } from "bullmq"
import {
  QUEUE_NAMES,
  getQueueOptions,
  type EmailJobData,
  type ChargeJobData,
  type NotificationJobData,
} from "./config"

// Singleton queue instances
let emailQueue: Queue<EmailJobData> | null = null
let chargeQueue: Queue<ChargeJobData> | null = null
let notificationQueue: Queue<NotificationJobData> | null = null

/**
 * Get or create the email queue
 */
export function getEmailQueue(): Queue<EmailJobData> {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, getQueueOptions(QUEUE_NAMES.EMAIL))
    console.log("[Queue] Email queue initialized")
  }
  return emailQueue
}

/**
 * Get or create the charge queue
 */
export function getChargeQueue(): Queue<ChargeJobData> {
  if (!chargeQueue) {
    chargeQueue = new Queue<ChargeJobData>(QUEUE_NAMES.CHARGE, getQueueOptions(QUEUE_NAMES.CHARGE))
    console.log("[Queue] Charge queue initialized")
  }
  return chargeQueue
}

/**
 * Get or create the notification queue
 */
export function getNotificationQueue(): Queue<NotificationJobData> {
  if (!notificationQueue) {
    notificationQueue = new Queue<NotificationJobData>(QUEUE_NAMES.NOTIFICATION, getQueueOptions(QUEUE_NAMES.NOTIFICATION))
    console.log("[Queue] Notification queue initialized")
  }
  return notificationQueue
}

/**
 * Get all queues (for Bull Board)
 */
export function getAllQueues(): Queue[] {
  return [
    getEmailQueue(),
    getChargeQueue(),
    getNotificationQueue(),
  ]
}

/**
 * Close all queues (for graceful shutdown)
 */
export async function closeAllQueues(): Promise<void> {
  const queues = [emailQueue, chargeQueue, notificationQueue].filter(Boolean) as Queue[]

  await Promise.all(queues.map(queue => queue.close()))

  emailQueue = null
  chargeQueue = null
  notificationQueue = null

  console.log("[Queue] All queues closed")
}

// ============================================
// Queue Job Addition Functions (convenience)
// ============================================

import { v4 as uuidv4 } from "uuid"

/**
 * Add an email job to the queue
 */
export async function queueEmail(data: EmailJobData, priority?: number) {
  const queue = getEmailQueue()
  const jobId = `email-${uuidv4()}`

  const job = await queue.add(jobId, data, {
    priority,
    jobId,
  })

  console.log(`[Queue] Email job added: ${jobId} to ${data.to}`)
  return job
}

/**
 * Add multiple email jobs to the queue (bulk)
 */
export async function queueEmailBulk(emails: EmailJobData[], priority?: number) {
  const queue = getEmailQueue()

  const jobs = emails.map((data, index) => ({
    name: `email-bulk-${uuidv4()}-${index}`,
    data,
    opts: {
      priority,
      jobId: `email-bulk-${uuidv4()}-${index}`,
    },
  }))

  const addedJobs = await queue.addBulk(jobs)
  console.log(`[Queue] ${addedJobs.length} email jobs added in bulk`)
  return addedJobs
}

/**
 * Add a charge creation job to the queue
 */
export async function queueCharge(data: ChargeJobData, priority?: number) {
  const queue = getChargeQueue()
  const jobId = `charge-${uuidv4()}`

  const job = await queue.add(jobId, data, {
    priority,
    jobId,
  })

  console.log(`[Queue] Charge job added: ${jobId} for customer ${data.asaasCustomerId}`)
  return job
}

/**
 * Add a notification job to the queue
 */
export async function queueNotification(data: NotificationJobData, priority?: number) {
  const queue = getNotificationQueue()
  const jobId = `notification-${uuidv4()}`

  const job = await queue.add(jobId, data, {
    priority,
    jobId,
  })

  console.log(`[Queue] Notification job added: ${jobId} type ${data.type}`)
  return job
}

// ============================================
// Queue Stats Functions
// ============================================

export interface QueueStats {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
}

/**
 * Get stats for a specific queue
 */
export async function getQueueStats(queue: Queue): Promise<QueueStats> {
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused(),
  ])

  return {
    name: queue.name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
  }
}

/**
 * Get stats for all queues
 */
export async function getAllQueueStats(): Promise<QueueStats[]> {
  const queues = getAllQueues()
  return Promise.all(queues.map(getQueueStats))
}
