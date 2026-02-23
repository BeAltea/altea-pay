import { emailWorker } from './workers/email.worker';
import { chargeWorker } from './workers/charge.worker';
import { emailQueue, chargeQueue } from './queues';
import { startHealthCheck } from './health';

console.log('==========================================');
console.log('AlteaPay BullMQ Workers Starting...');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Redis: ${(process.env.REDIS_URL || 'localhost').replace(/\/\/.*@/, '//***@')}`);
console.log('==========================================');

startHealthCheck({ emailQueue, chargeQueue });

console.log('   Email Worker (SendGrid) - Active');
console.log('   Charge Worker (ASAAS) - Active');
console.log('   ASAAS: WhatsApp + SMS only (email disabled)');
console.log('==========================================');

const shutdown = async (signal: string) => {
  console.log(`[WORKERS] ${signal} received. Shutting down...`);
  await Promise.allSettled([emailWorker.close(), chargeWorker.close()]);
  console.log('[WORKERS] Closed. Exiting.');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => console.error('[WORKERS] Uncaught:', err));
process.on('unhandledRejection', (reason) => console.error('[WORKERS] Unhandled:', reason));
