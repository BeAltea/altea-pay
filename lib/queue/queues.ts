import { Queue } from 'bullmq';
import { QUEUE_CONFIG } from './config';
import IORedis from 'ioredis';

let _connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!_connection) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    _connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 10000,
      ...(url.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
      retryStrategy: (times: number) => {
        if (times > 3) return null;
        return Math.min(times * 500, 2000);
      },
    });
    _connection.on('error', (err) => console.error('[REDIS] Queue error:', err.message));
  }
  return _connection;
}

export const emailQueue = new Queue(QUEUE_CONFIG.email.name, {
  connection: getConnection(),
  defaultJobOptions: {
    attempts: QUEUE_CONFIG.email.retries.attempts,
    backoff: QUEUE_CONFIG.email.retries.backoff,
    removeOnComplete: QUEUE_CONFIG.email.removeOnComplete,
    removeOnFail: QUEUE_CONFIG.email.removeOnFail,
  },
});

export const chargeQueue = new Queue(QUEUE_CONFIG.charge.name, {
  connection: getConnection(),
  defaultJobOptions: {
    attempts: QUEUE_CONFIG.charge.retries.attempts,
    backoff: QUEUE_CONFIG.charge.retries.backoff,
    removeOnComplete: QUEUE_CONFIG.charge.removeOnComplete,
    removeOnFail: QUEUE_CONFIG.charge.removeOnFail,
  },
});

// ASAAS Batch Queues
export const asaasChargeCreateQueue = new Queue(QUEUE_CONFIG.asaasChargeCreate.name, {
  connection: getConnection(),
  defaultJobOptions: {
    attempts: QUEUE_CONFIG.asaasChargeCreate.retries.attempts,
    backoff: QUEUE_CONFIG.asaasChargeCreate.retries.backoff,
    removeOnComplete: QUEUE_CONFIG.asaasChargeCreate.removeOnComplete,
    removeOnFail: QUEUE_CONFIG.asaasChargeCreate.removeOnFail,
  },
});

export const asaasChargeUpdateQueue = new Queue(QUEUE_CONFIG.asaasChargeUpdate.name, {
  connection: getConnection(),
  defaultJobOptions: {
    attempts: QUEUE_CONFIG.asaasChargeUpdate.retries.attempts,
    backoff: QUEUE_CONFIG.asaasChargeUpdate.retries.backoff,
    removeOnComplete: QUEUE_CONFIG.asaasChargeUpdate.removeOnComplete,
    removeOnFail: QUEUE_CONFIG.asaasChargeUpdate.removeOnFail,
  },
});

export const asaasChargeCancelQueue = new Queue(QUEUE_CONFIG.asaasChargeCancel.name, {
  connection: getConnection(),
  defaultJobOptions: {
    attempts: QUEUE_CONFIG.asaasChargeCancel.retries.attempts,
    backoff: QUEUE_CONFIG.asaasChargeCancel.retries.backoff,
    removeOnComplete: QUEUE_CONFIG.asaasChargeCancel.removeOnComplete,
    removeOnFail: QUEUE_CONFIG.asaasChargeCancel.removeOnFail,
  },
});

export const asaasNotificationQueue = new Queue(QUEUE_CONFIG.asaasNotification.name, {
  connection: getConnection(),
  defaultJobOptions: {
    attempts: QUEUE_CONFIG.asaasNotification.retries.attempts,
    backoff: QUEUE_CONFIG.asaasNotification.retries.backoff,
    removeOnComplete: QUEUE_CONFIG.asaasNotification.removeOnComplete,
    removeOnFail: QUEUE_CONFIG.asaasNotification.removeOnFail,
  },
});

export const asaasSyncQueue = new Queue(QUEUE_CONFIG.asaasSync.name, {
  connection: getConnection(),
  defaultJobOptions: {
    attempts: QUEUE_CONFIG.asaasSync.retries.attempts,
    backoff: QUEUE_CONFIG.asaasSync.retries.backoff,
    removeOnComplete: QUEUE_CONFIG.asaasSync.removeOnComplete,
    removeOnFail: QUEUE_CONFIG.asaasSync.removeOnFail,
  },
});
