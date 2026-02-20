/**
 * Queue Configuration
 *
 * Central configuration for all BullMQ queues used in AlteaPay.
 */

import type { QueueOptions, WorkerOptions, JobsOptions } from "bullmq"
import { getRedisOptions } from "./connection"

// Queue names
export const QUEUE_NAMES = {
  EMAIL: "email",
  CHARGE: "charge",
  NOTIFICATION: "notification",
} as const

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]

// Default queue options
export function getQueueOptions(queueName: QueueName): QueueOptions {
  return {
    connection: getRedisOptions(),
    defaultJobOptions: getDefaultJobOptions(queueName),
  }
}

// Default worker options
export function getWorkerOptions(queueName: QueueName): WorkerOptions {
  return {
    connection: getRedisOptions(),
    concurrency: getWorkerConcurrency(queueName),
    limiter: getWorkerRateLimiter(queueName),
  }
}

// Get default job options per queue
function getDefaultJobOptions(queueName: QueueName): JobsOptions {
  const baseOptions: JobsOptions = {
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,    // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      count: 5000,        // Keep max 5000 failed jobs
    },
  }

  switch (queueName) {
    case QUEUE_NAMES.EMAIL:
      return {
        ...baseOptions,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 2000, // Start with 2 seconds
        },
      }

    case QUEUE_NAMES.CHARGE:
      return {
        ...baseOptions,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000, // Start with 5 seconds (ASAAS has rate limits)
        },
      }

    case QUEUE_NAMES.NOTIFICATION:
      return {
        ...baseOptions,
        attempts: 3,
        backoff: {
          type: "fixed",
          delay: 1000,
        },
      }

    default:
      return baseOptions
  }
}

// Get worker concurrency per queue
function getWorkerConcurrency(queueName: QueueName): number {
  switch (queueName) {
    case QUEUE_NAMES.EMAIL:
      return 10  // SendGrid can handle high concurrency
    case QUEUE_NAMES.CHARGE:
      return 3   // ASAAS has rate limits
    case QUEUE_NAMES.NOTIFICATION:
      return 5
    default:
      return 5
  }
}

// Get rate limiter per queue
function getWorkerRateLimiter(queueName: QueueName): WorkerOptions["limiter"] {
  switch (queueName) {
    case QUEUE_NAMES.EMAIL:
      // SendGrid: 100 emails per second
      return {
        max: 100,
        duration: 1000,
      }

    case QUEUE_NAMES.CHARGE:
      // ASAAS: 10 requests per second (conservative)
      return {
        max: 10,
        duration: 1000,
      }

    case QUEUE_NAMES.NOTIFICATION:
      return {
        max: 50,
        duration: 1000,
      }

    default:
      return undefined
  }
}

// Job types
export interface EmailJobData {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  from?: string
  fromName?: string
  metadata?: {
    customerId?: string
    companyId?: string
    agreementId?: string
    templateName?: string
    [key: string]: string | undefined
  }
}

export interface ChargeJobData {
  customerId: string
  asaasCustomerId: string
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED"
  value: number
  dueDate: string
  description?: string
  externalReference?: string
  installmentCount?: number
  installmentValue?: number
  metadata?: {
    agreementId?: string
    companyId?: string
    [key: string]: string | undefined
  }
}

export interface NotificationJobData {
  type: "email" | "sms" | "whatsapp"
  recipientId: string
  customerId?: string
  companyId?: string
  templateName: string
  templateData: Record<string, string | number>
  metadata?: Record<string, string | undefined>
}

// Job result types
export interface EmailJobResult {
  success: boolean
  messageId?: string
  error?: string
  timestamp: string
}

export interface ChargeJobResult {
  success: boolean
  asaasPaymentId?: string
  invoiceUrl?: string
  error?: string
  timestamp: string
}

export interface NotificationJobResult {
  success: boolean
  sentVia?: string
  error?: string
  timestamp: string
}
