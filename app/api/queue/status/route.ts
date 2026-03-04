import { NextResponse } from "next/server"
import { bulkNegotiationsQueue } from "@/lib/queue/queues"

export const dynamic = "force-dynamic"

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
}

/**
 * GET /api/queue/status
 *
 * Returns the current status of the bulk negotiations queue.
 */
export async function GET() {
  try {
    const [waiting, active, completed] = await Promise.all([
      bulkNegotiationsQueue.getWaitingCount(),
      bulkNegotiationsQueue.getActiveCount(),
      bulkNegotiationsQueue.getCompletedCount(),
    ])

    return NextResponse.json(
      {
        waiting,
        active,
        completed,
        total: waiting + active + completed,
      },
      { headers: noCacheHeaders }
    )
  } catch (error) {
    console.error("[Queue Status] Error:", error)
    return NextResponse.json(
      { error: "Erro ao obter status da fila", waiting: 0, active: 0, completed: 0, total: 0 },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
