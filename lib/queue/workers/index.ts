/**
 * Worker Process Entry Point
 *
 * This file starts all workers when run as a separate process.
 * Usage: tsx lib/queue/workers/index.ts
 */

import { Worker } from "bullmq"
import { createEmailWorker } from "./email.worker"
import { createChargeWorker } from "./charge.worker"
import { closeRedisConnection } from "../connection"
import { closeAllQueues } from "../queues"

const workers: Worker[] = []

async function startWorkers(): Promise<void> {
  console.log("========================================")
  console.log("AlteaPay Queue Workers Starting...")
  console.log("========================================")

  // Start all workers
  workers.push(createEmailWorker())
  workers.push(createChargeWorker())

  console.log(`[Workers] ${workers.length} workers started`)
  console.log("========================================")
}

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n[Workers] Received ${signal}, shutting down gracefully...`)

  // Close all workers
  await Promise.all(workers.map(worker => worker.close()))
  console.log("[Workers] All workers closed")

  // Close queues
  await closeAllQueues()

  // Close Redis connection
  await closeRedisConnection()

  console.log("[Workers] Graceful shutdown complete")
  process.exit(0)
}

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

// Handle uncaught errors
process.on("uncaughtException", (err) => {
  console.error("[Workers] Uncaught exception:", err)
  gracefulShutdown("uncaughtException")
})

process.on("unhandledRejection", (reason) => {
  console.error("[Workers] Unhandled rejection:", reason)
  gracefulShutdown("unhandledRejection")
})

// Start workers
startWorkers().catch((err) => {
  console.error("[Workers] Failed to start:", err)
  process.exit(1)
})
