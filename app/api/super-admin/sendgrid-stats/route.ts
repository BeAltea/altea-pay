import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
}

// Simple in-memory cache for SendGrid responses
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached(key: string) {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  cache.delete(key)
  return null
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() })
}

interface SendGridDayStats {
  date: string
  stats: Array<{
    metrics: {
      requests: number
      delivered: number
      opens: number
      unique_opens: number
      clicks: number
      unique_clicks: number
      bounces: number
      spam_reports: number
      blocks: number
      invalid_emails: number
      deferred: number
    }
  }>
}

export async function GET(request: NextRequest) {
  try {
    // Verify the user is a super admin
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401, headers: noCacheHeaders })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403, headers: noCacheHeaders })
    }

    // Get SendGrid API key
    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "SENDGRID_API_KEY não configurada" },
        { status: 500, headers: noCacheHeaders }
      )
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "30" // days

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = endDate.toISOString().split("T")[0]

    // Check cache
    const cacheKey = `sendgrid-stats-${startDateStr}-${endDateStr}`
    const cachedData = getCached(cacheKey)
    if (cachedData) {
      console.log("[SendGrid Stats] Returning cached data")
      return NextResponse.json(cachedData, { headers: noCacheHeaders })
    }

    console.log(`[SendGrid Stats] Fetching stats from ${startDateStr} to ${endDateStr}`)

    // Fetch from SendGrid Stats API
    const response = await fetch(
      `https://api.sendgrid.com/v3/stats?start_date=${startDateStr}&end_date=${endDateStr}&aggregated_by=day`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[SendGrid Stats] API error:", response.status, errorText)
      return NextResponse.json(
        { error: `Erro ao buscar estatísticas do SendGrid: ${response.status}` },
        { status: 500, headers: noCacheHeaders }
      )
    }

    const statsData: SendGridDayStats[] = await response.json()

    // Aggregate all days
    const totals = {
      requests: 0,
      delivered: 0,
      opens: 0,
      unique_opens: 0,
      clicks: 0,
      unique_clicks: 0,
      bounces: 0,
      spam_reports: 0,
      blocks: 0,
      invalid_emails: 0,
      deferred: 0,
    }

    // Also collect daily data for the chart
    const dailyStats: Array<{
      date: string
      requests: number
      delivered: number
      opens: number
      bounces: number
      blocks: number
    }> = []

    for (const day of statsData) {
      const metrics = day.stats[0]?.metrics
      if (metrics) {
        totals.requests += metrics.requests || 0
        totals.delivered += metrics.delivered || 0
        totals.opens += metrics.opens || 0
        totals.unique_opens += metrics.unique_opens || 0
        totals.clicks += metrics.clicks || 0
        totals.unique_clicks += metrics.unique_clicks || 0
        totals.bounces += metrics.bounces || 0
        totals.spam_reports += metrics.spam_reports || 0
        totals.blocks += metrics.blocks || 0
        totals.invalid_emails += metrics.invalid_emails || 0
        totals.deferred += metrics.deferred || 0

        dailyStats.push({
          date: day.date,
          requests: metrics.requests || 0,
          delivered: metrics.delivered || 0,
          opens: metrics.opens || 0,
          bounces: metrics.bounces || 0,
          blocks: metrics.blocks || 0,
        })
      }
    }

    // Calculate rates
    const result = {
      summary: {
        requests: totals.requests,
        delivered: totals.delivered,
        deliveredRate: totals.requests > 0 ? (totals.delivered / totals.requests) * 100 : 0,
        opens: totals.opens,
        opensRate: totals.requests > 0 ? (totals.opens / totals.requests) * 100 : 0,
        uniqueOpens: totals.unique_opens,
        clicks: totals.clicks,
        clicksRate: totals.requests > 0 ? (totals.clicks / totals.requests) * 100 : 0,
        bounces: totals.bounces,
        bouncesRate: totals.requests > 0 ? (totals.bounces / totals.requests) * 100 : 0,
        blocks: totals.blocks,
        blocksRate: totals.requests > 0 ? (totals.blocks / totals.requests) * 100 : 0,
        spamReports: totals.spam_reports,
        spamRate: totals.requests > 0 ? (totals.spam_reports / totals.requests) * 100 : 0,
        invalidEmails: totals.invalid_emails,
        deferred: totals.deferred,
      },
      dailyStats,
      period: {
        start: startDateStr,
        end: endDateStr,
        days: parseInt(period),
      },
    }

    // Cache the result
    setCache(cacheKey, result)

    return NextResponse.json(result, { headers: noCacheHeaders })
  } catch (error: unknown) {
    console.error("[SendGrid Stats] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
