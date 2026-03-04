import { NextRequest, NextResponse } from "next/server"
import { bulkEmailQueue } from "@/lib/queue/queues"
import type { BulkEmailProgress, BulkEmailResult } from "@/lib/queue/workers/bulk-email.worker"

export const dynamic = "force-dynamic"

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
}

export interface EmailJobStatus {
  jobId: string
  status: "waiting" | "active" | "completed" | "failed" | "not_found"
  progress?: BulkEmailProgress
  result?: BulkEmailResult
  error?: string
  createdAt?: string
  processedAt?: string
  finishedAt?: string
}

/**
 * GET /api/super-admin/send-email/status?job_id=xxx
 *
 * Poll the status of a bulk email job.
 */
export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get("job_id")

    if (!jobId) {
      return NextResponse.json(
        { error: "job_id é obrigatório" },
        { status: 400, headers: noCacheHeaders }
      )
    }

    const job = await bulkEmailQueue.getJob(jobId)

    if (!job) {
      return NextResponse.json(
        {
          jobId,
          status: "not_found",
          error: "Job não encontrado",
        } as EmailJobStatus,
        { status: 404, headers: noCacheHeaders }
      )
    }

    const state = await job.getState()
    const progress = job.progress as BulkEmailProgress | undefined

    let status: EmailJobStatus["status"]
    switch (state) {
      case "waiting":
      case "delayed":
      case "prioritized":
        status = "waiting"
        break
      case "active":
        status = "active"
        break
      case "completed":
        status = "completed"
        break
      case "failed":
        status = "failed"
        break
      default:
        status = "waiting"
    }

    const response: EmailJobStatus = {
      jobId,
      status,
      progress: progress && typeof progress === "object" ? progress : undefined,
      createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : undefined,
      processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
    }

    // Include result if completed
    if (status === "completed" && job.returnvalue) {
      response.result = job.returnvalue as BulkEmailResult
    }

    // Include error if failed
    if (status === "failed" && job.failedReason) {
      response.error = job.failedReason
    }

    return NextResponse.json(response, { headers: noCacheHeaders })
  } catch (error) {
    console.error("[Email Status] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
