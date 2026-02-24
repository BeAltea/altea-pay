import { Worker, Processor, WorkerOptions, QueueEvents } from 'bullmq';
import { connection } from './connection';
import { QUEUE_CONFIG } from './config';

type QueueName = keyof typeof QUEUE_CONFIG;

interface WorkerEntry {
  worker: Worker;
  queueEvents: QueueEvents;
  isRunning: boolean;
  startPromise: Promise<void> | null;
}

/**
 * WorkerManager - Singleton utility for managing BullMQ workers
 *
 * This manager implements on-demand worker activation to reduce Redis polling costs
 * when using Upstash or other serverless Redis providers.
 *
 * Features:
 * - Workers start only when jobs are added (autorun: false)
 * - Workers pause themselves when queue is drained
 * - QueueEvents listeners detect new jobs and resume paused workers
 * - Graceful shutdown on SIGTERM/SIGINT
 * - Thread-safe worker start/stop operations
 * - 30 second drainDelay to prevent rapid start/stop cycles
 */
class WorkerManagerClass {
  private workers: Map<string, WorkerEntry> = new Map();
  private isShuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;

  constructor() {
    // Setup graceful shutdown handlers
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  /**
   * Register a worker with the manager (does NOT start it)
   * Workers are created with autorun: false and will be started on-demand
   */
  registerWorker<T>(
    queueName: string,
    processor: Processor<T>,
    options: Omit<WorkerOptions, 'connection' | 'autorun'>
  ): Worker<T> {
    const workerOptions: WorkerOptions = {
      ...options,
      connection,
      autorun: false, // Critical: don't start polling immediately
      drainDelay: 30000, // Wait 30s before considering queue drained
    };

    const worker = new Worker<T>(queueName, processor, workerOptions);

    // Create QueueEvents listener to detect new jobs
    const queueEvents = new QueueEvents(queueName, { connection });

    // Listen for new jobs being added - resume worker if paused
    queueEvents.on('waiting', () => {
      this.onJobWaiting(queueName);
    });

    // Setup drained event handler to pause worker when queue is empty
    worker.on('drained', () => {
      this.onWorkerDrained(queueName);
    });

    // Store worker entry
    this.workers.set(queueName, {
      worker,
      queueEvents,
      isRunning: false,
      startPromise: null,
    });

    console.log(`[WORKER-MANAGER] Registered worker for queue: ${queueName}`);

    return worker;
  }

  /**
   * Handle new job waiting in queue - resume worker if paused
   */
  private onJobWaiting(queueName: string): void {
    const entry = this.workers.get(queueName);
    if (!entry || this.isShuttingDown) return;

    // If worker is not running, start it
    if (!entry.isRunning) {
      console.log(`[WORKER-MANAGER] New job detected, resuming worker: ${queueName}`);
      this.ensureWorkerRunning(queueName).catch((err) => {
        console.error(`[WORKER-MANAGER] Failed to resume worker ${queueName}: ${err.message}`);
      });
    }
  }

  /**
   * Ensure a worker is running for the given queue.
   * This should be called before adding jobs to a queue.
   * Thread-safe: handles concurrent calls gracefully.
   */
  async ensureWorkerRunning(queueName: string): Promise<void> {
    if (this.isShuttingDown) {
      console.warn(`[WORKER-MANAGER] Cannot start worker during shutdown: ${queueName}`);
      return;
    }

    const entry = this.workers.get(queueName);
    if (!entry) {
      console.warn(`[WORKER-MANAGER] No worker registered for queue: ${queueName}`);
      return;
    }

    // Already running
    if (entry.isRunning) {
      return;
    }

    // Another call is already starting this worker - wait for it
    if (entry.startPromise) {
      await entry.startPromise;
      return;
    }

    // Start the worker
    const startPromise = this.startWorker(queueName, entry);
    entry.startPromise = startPromise;

    try {
      await startPromise;
    } finally {
      entry.startPromise = null;
    }
  }

  /**
   * Internal method to start a worker
   */
  private async startWorker(queueName: string, entry: WorkerEntry): Promise<void> {
    if (entry.isRunning) return;

    console.log(`[WORKER-MANAGER] Starting worker for queue: ${queueName}`);

    try {
      // Check if worker is paused and resume it
      if (entry.worker.isPaused()) {
        entry.worker.resume();
        entry.isRunning = true;
        console.log(`[WORKER-MANAGER] Worker resumed: ${queueName}`);
      } else {
        // First time start
        await entry.worker.run();
        entry.isRunning = true;
        console.log(`[WORKER-MANAGER] Worker started: ${queueName}`);
      }
    } catch (error: any) {
      console.error(`[WORKER-MANAGER] Failed to start worker ${queueName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle worker drained event - pause the worker to reduce polling
   */
  private onWorkerDrained(queueName: string): void {
    const entry = this.workers.get(queueName);
    if (!entry || !entry.isRunning) return;

    console.log(`[WORKER-MANAGER] Queue drained, pausing worker: ${queueName}`);

    entry.worker.pause();
    entry.isRunning = false;

    console.log(`[WORKER-MANAGER] Worker paused: ${queueName}`);
  }

  /**
   * Get all registered workers (for health checks, etc.)
   */
  getWorkers(): Worker[] {
    return Array.from(this.workers.values()).map((e) => e.worker);
  }

  /**
   * Get worker status for a queue
   */
  getWorkerStatus(queueName: string): { registered: boolean; running: boolean } {
    const entry = this.workers.get(queueName);
    return {
      registered: !!entry,
      running: entry?.isRunning ?? false,
    };
  }

  /**
   * Get status of all workers
   */
  getAllWorkerStatus(): Record<string, { running: boolean }> {
    const status: Record<string, { running: boolean }> = {};
    this.workers.forEach((entry, name) => {
      status[name] = { running: entry.isRunning };
    });
    return status;
  }

  /**
   * Graceful shutdown - close all workers and queue events
   */
  async shutdown(signal: string): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.isShuttingDown = true;
    console.log(`[WORKER-MANAGER] ${signal} received. Shutting down all workers...`);

    this.shutdownPromise = (async () => {
      const entries = Array.from(this.workers.values());

      // Close all workers and queue events
      const closePromises: Promise<void>[] = [];
      for (const e of entries) {
        closePromises.push(e.worker.close());
        closePromises.push(e.queueEvents.close());
      }

      const results = await Promise.allSettled(closePromises);

      // Log any errors
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`[WORKER-MANAGER] Error during shutdown ${index}: ${result.reason}`);
        }
      });

      console.log('[WORKER-MANAGER] All workers and event listeners closed.');
      process.exit(0);
    })();

    return this.shutdownPromise;
  }

  /**
   * Start all registered workers (for warm start scenarios)
   */
  async startAllWorkers(): Promise<void> {
    const queueNames = Array.from(this.workers.keys());
    await Promise.all(queueNames.map((name) => this.ensureWorkerRunning(name)));
    console.log(`[WORKER-MANAGER] All ${queueNames.length} workers started`);
  }
}

// Export singleton instance
export const WorkerManager = new WorkerManagerClass();

// Re-export for convenience
export { connection };
