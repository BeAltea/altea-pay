import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...(REDIS_URL.startsWith('rediss://') ? { tls: { rejectUnauthorized: false } } : {}),
  retryStrategy: (times: number) => {
    if (times > 20) {
      console.error(`[REDIS] Failed to connect after ${times} attempts`);
      return null;
    }
    return Math.min(times * 200, 5000);
  },
});

connection.on('error', (err) => console.error('[REDIS] Error:', err.message));
connection.on('connect', () => console.log('[REDIS] Worker connected'));
connection.on('close', () => console.warn('[REDIS] Connection closed, reconnecting...'));

export { connection };
