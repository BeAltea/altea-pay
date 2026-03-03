import { NextRequest, NextResponse } from "next/server"
import { assertivaLocalizeQueue } from "@/lib/queue/queues"

export const dynamic = "force-dynamic"

/**
 * GET /api/super-admin/localize/status
 *
 * Get the status and progress of an Assertiva Localize job.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get("job_id")

    if (!jobId) {
      return NextResponse.json(
        { error: "job_id é obrigatório" },
        { status: 400 }
      )
    }

    const job = await assertivaLocalizeQueue.getJob(jobId)

    if (!job) {
      return NextResponse.json(
        { error: "Job não encontrado" },
        { status: 404 }
      )
    }

    const state = await job.getState()
    const progress = (job.progress as any) || {}

    return NextResponse.json({
      job_id: job.id,
      status: state, // 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
      progress: {
        processed: progress.processed || 0,
        total: progress.total || job.data.totalClients || 0,
        percentage: progress.percentage || 0,
        emailsFound: progress.emailsFound || 0,
        phonesFound: progress.phonesFound || 0,
        emailsApplied: progress.emailsApplied || 0,
        phonesApplied: progress.phonesApplied || 0,
        notFound: progress.notFound || 0,
        errors: progress.errors || 0,
        currentClientName: progress.currentClientName || null,
      },
      result: state === "completed" ? job.returnvalue : null,
      failedReason: state === "failed" ? job.failedReason : null,
      createdAt: job.timestamp,
      data: {
        companyId: job.data.companyId,
        totalClients: job.data.totalClients,
        filterUsed: job.data.filterUsed,
        autoApply: job.data.autoApply,
      },
    })
  } catch (error: any) {
    console.error("[Localize Status] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error.message },
      { status: 500 }
    )
  }
}
