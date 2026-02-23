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
