import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
}

// Simple in-memory cache
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

interface SuppressionRecord {
  email: string
  reason: string
  status?: string
  created: number
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

    // Calculate date range as Unix timestamps
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    const startTime = Math.floor(startDate.getTime() / 1000)
    const endTime = Math.floor(endDate.getTime() / 1000)

    // Check cache
    const cacheKey = `sendgrid-failures-${startTime}-${endTime}`
    const cachedData = getCached(cacheKey)
    if (cachedData) {
      console.log("[SendGrid Failures] Returning cached data")
      return NextResponse.json(cachedData, { headers: noCacheHeaders })
    }

    console.log(`[SendGrid Failures] Fetching failures from ${startTime} to ${endTime}`)

    // Fetch all suppression types in parallel
    const [bouncesRes, blocksRes, invalidRes, spamRes] = await Promise.all([
      fetch(
        `https://api.sendgrid.com/v3/suppression/bounces?start_time=${startTime}&end_time=${endTime}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      ),
      fetch(
        `https://api.sendgrid.com/v3/suppression/blocks?start_time=${startTime}&end_time=${endTime}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      ),
      fetch(
        `https://api.sendgrid.com/v3/suppression/invalid_emails?start_time=${startTime}&end_time=${endTime}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      ),
      fetch(
        `https://api.sendgrid.com/v3/suppression/spam_reports?start_time=${startTime}&end_time=${endTime}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      ),
    ])

    // Parse responses
    const bounces: SuppressionRecord[] = bouncesRes.ok ? await bouncesRes.json() : []
    const blocks: SuppressionRecord[] = blocksRes.ok ? await blocksRes.json() : []
    const invalidEmails: SuppressionRecord[] = invalidRes.ok ? await invalidRes.json() : []
    const spamReports: SuppressionRecord[] = spamRes.ok ? await spamRes.json() : []

    // Format the data
    const formatRecords = (records: SuppressionRecord[], type: string) =>
      records.map((r) => ({
        email: r.email,
        reason: r.reason || "Sem motivo informado",
        status: r.status,
        type,
        createdAt: new Date(r.created * 1000).toISOString(),
      }))

    const result = {
      bounces: formatRecords(bounces, "bounce"),
      blocks: formatRecords(blocks, "block"),
      invalidEmails: formatRecords(invalidEmails, "invalid"),
      spamReports: formatRecords(spamReports, "spam"),
      totals: {
        bounces: bounces.length,
        blocks: blocks.length,
        invalidEmails: invalidEmails.length,
        spamReports: spamReports.length,
        total: bounces.length + blocks.length + invalidEmails.length + spamReports.length,
      },
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: parseInt(period),
      },
    }

    // Cache the result
    setCache(cacheKey, result)

    return NextResponse.json(result, { headers: noCacheHeaders })
  } catch (error: unknown) {
    console.error("[SendGrid Failures] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
