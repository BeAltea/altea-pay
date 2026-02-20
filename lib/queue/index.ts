/**
 * Queue System - Main Export
 *
 * This module re-exports all queue functionality for easy importing.
 */

// Connection
export {
  getRedisConnection,
  closeRedisConnection,
  isRedisConnected,
  getRedisOptions,
} from "./connection"

// Configuration
export {
  QUEUE_NAMES,
  type QueueName,
  type EmailJobData,
  type ChargeJobData,
  type NotificationJobData,
  type EmailJobResult,
  type ChargeJobResult,
  type NotificationJobResult,
} from "./config"

// Queues
export {
  getEmailQueue,
  getChargeQueue,
  getNotificationQueue,
  getAllQueues,
  closeAllQueues,
  queueEmail,
  queueEmailBulk,
  queueCharge,
  queueNotification,
  getQueueStats,
  getAllQueueStats,
  type QueueStats,
} from "./queues"

// Bull Board
export {
  getBullBoardAdapter,
  refreshBullBoard,
} from "./bull-board"
