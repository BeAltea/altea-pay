/**
 * Queue Status API Route
 *
 * GET /api/queue/status - Get status of all queues
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAllQueueStats, isRedisConnected } from "@/lib/queue"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Check if user is super_admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json(
        { success: false, error: "Acesso restrito a super admin" },
        { status: 403 }
      )
    }

    // Get queue stats
    const stats = await getAllQueueStats()
    const redisConnected = isRedisConnected()

    // Calculate totals
    const totals = stats.reduce(
      (acc, queue) => ({
        waiting: acc.waiting + queue.waiting,
        active: acc.active + queue.active,
        completed: acc.completed + queue.completed,
        failed: acc.failed + queue.failed,
        delayed: acc.delayed + queue.delayed,
      }),
      { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
    )

    return NextResponse.json({
      success: true,
      redis: {
        connected: redisConnected,
      },
      queues: stats,
      totals,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[API] /api/queue/status error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno",
        redis: {
          connected: false,
        },
      },
      { status: 500 }
    )
  }
}
