/**
 * Queue Logs API Route
 *
 * GET /api/logs - Get queue processing logs
 * Access restricted to super_admin
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      )
    }

    // Check if user is super_admin
    const { data: profile } = await authSupabase
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const queueName = searchParams.get("queue") || undefined
    const status = searchParams.get("status") || undefined
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 500)
    const offset = parseInt(searchParams.get("offset") || "0")
    const search = searchParams.get("search") || undefined

    // Build query
    const supabase = createAdminClient()
    let query = supabase
      .from("queue_logs")
      .select("*", { count: "exact" })
      .order("processed_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (queueName) {
      query = query.eq("queue_name", queueName)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (search) {
      query = query.or(`job_id.ilike.%${search}%,job_name.ilike.%${search}%`)
    }

    const { data: logs, error, count } = await query

    if (error) {
      console.error("[API] /api/logs query error:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Get summary stats
    const { data: stats } = await supabase
      .from("queue_logs")
      .select("queue_name, status")

    const summary = {
      total: count || 0,
      byQueue: {} as Record<string, { completed: number; failed: number }>,
      byStatus: { completed: 0, failed: 0 },
    }

    if (stats) {
      for (const log of stats) {
        if (!summary.byQueue[log.queue_name]) {
          summary.byQueue[log.queue_name] = { completed: 0, failed: 0 }
        }
        if (log.status === "completed") {
          summary.byQueue[log.queue_name].completed++
          summary.byStatus.completed++
        } else if (log.status === "failed") {
          summary.byQueue[log.queue_name].failed++
          summary.byStatus.failed++
        }
      }
    }

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
      summary,
    })
  } catch (error: any) {
    console.error("[API] /api/logs error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    )
  }
}
