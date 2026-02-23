import { emailWorker } from './workers/email.worker';
import { chargeWorker } from './workers/charge.worker';
import { asaasChargeCreateWorker } from './workers/asaas-charge-create.worker';
import { asaasChargeUpdateWorker } from './workers/asaas-charge-update.worker';
import { asaasChargeCancelWorker } from './workers/asaas-charge-cancel.worker';
import { asaasNotificationWorker } from './workers/asaas-notification.worker';
import { asaasSyncWorker } from './workers/asaas-sync.worker';
import {
  emailQueue,
  chargeQueue,
  asaasChargeCreateQueue,
  asaasChargeUpdateQueue,
  asaasChargeCancelQueue,
  asaasNotificationQueue,
  asaasSyncQueue,
} from './queues';
import { startHealthCheck } from './health';

console.log('==========================================');
console.log('AlteaPay BullMQ Workers Starting...');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Redis: ${(process.env.REDIS_URL || 'localhost').replace(/\/\/.*@/, '//***@')}`);
console.log('==========================================');

startHealthCheck({
  emailQueue,
  chargeQueue,
  asaasChargeCreateQueue,
  asaasChargeUpdateQueue,
  asaasChargeCancelQueue,
  asaasNotificationQueue,
  asaasSyncQueue,
});

console.log('   Email Worker (SendGrid) - Active');
console.log('   Charge Worker (ASAAS Legacy) - Active');
console.log('   ASAAS Charge Create Worker - Active');
console.log('   ASAAS Charge Update Worker - Active');
console.log('   ASAAS Charge Cancel Worker - Active');
console.log('   ASAAS Notification Worker - Active');
console.log('   ASAAS Sync Worker - Active');
console.log('   Rate Limit: 10 req/s per ASAAS queue');
console.log('==========================================');

const allWorkers = [
  emailWorker,
  chargeWorker,
  asaasChargeCreateWorker,
  asaasChargeUpdateWorker,
  asaasChargeCancelWorker,
  asaasNotificationWorker,
  asaasSyncWorker,
];

const shutdown = async (signal: string) => {
  console.log(`[WORKERS] ${signal} received. Shutting down...`);
  await Promise.allSettled(allWorkers.map((w) => w.close()));
  console.log('[WORKERS] Closed. Exiting.');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => console.error('[WORKERS] Uncaught:', err));
process.on('unhandledRejection', (reason) => console.error('[WORKERS] Unhandled:', reason));
