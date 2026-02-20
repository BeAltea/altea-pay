/**
 * Bull Board Setup
 *
 * Provides a visual dashboard for monitoring BullMQ queues.
 * Access at: /api/queue/ui
 */

import { createBullBoard } from "@bull-board/api"
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter"
import { ExpressAdapter } from "@bull-board/express"
import { getAllQueues } from "./queues"

let serverAdapter: ExpressAdapter | null = null
let bullBoard: ReturnType<typeof createBullBoard> | null = null

/**
 * Get or create the Bull Board express adapter
 */
export function getBullBoardAdapter(): ExpressAdapter {
  if (!serverAdapter) {
    serverAdapter = new ExpressAdapter()
    serverAdapter.setBasePath("/api/queue/ui")

    const queues = getAllQueues()

    bullBoard = createBullBoard({
      queues: queues.map(queue => new BullMQAdapter(queue)),
      serverAdapter,
    })

    console.log("[BullBoard] Dashboard initialized at /api/queue/ui")
  }

  return serverAdapter
}

/**
 * Refresh Bull Board with updated queues
 * Call this if queues are dynamically added
 */
export function refreshBullBoard(): void {
  if (bullBoard) {
    const queues = getAllQueues()
    bullBoard.setQueues(queues.map(queue => new BullMQAdapter(queue)))
    console.log("[BullBoard] Dashboard queues refreshed")
  }
}
