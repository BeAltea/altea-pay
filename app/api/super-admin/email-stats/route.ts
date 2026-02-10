import { createAdminClient, createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
}

interface EmailBatch {
  subject: string
  companyId: string
  companyName: string
  sentAt: string
  totalSent: number
  totalFailed: number
}

export async function GET(request: NextRequest) {
  try {
    // Verify the user is a super admin
    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401, headers: noCacheHeaders })
    }

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403, headers: noCacheHeaders })
    }

    const supabase = createAdminClient()

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get("companyId")
    const subjectSearch = searchParams.get("subject") || ""
    const period = searchParams.get("period") || "7" // days

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // Fetch companies for reference
    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, name")
      .order("name")

    const companiesMap = new Map(companiesData?.map(c => [c.id, c.name]) || [])

    // Fetch email tracking data
    let query = supabase
      .from("email_sent_tracking")
      .select("id, company_id, email_subject, sent_at, status, error_message")
      .gte("sent_at", startDate.toISOString())
      .lte("sent_at", endDate.toISOString())
      .order("sent_at", { ascending: false })

    if (companyId) {
      query = query.eq("company_id", companyId)
    }

    const { data: trackingData, error: trackingError } = await query

    if (trackingError) {
      console.error("[Email Stats] Error fetching tracking data:", trackingError)
      return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500, headers: noCacheHeaders })
    }

    // Filter by subject if provided
    let filteredData = trackingData || []
    if (subjectSearch) {
      const searchLower = subjectSearch.toLowerCase()
      filteredData = filteredData.filter(d =>
        d.email_subject?.toLowerCase().includes(searchLower)
      )
    }

    // Group by subject + date (truncated to minute) to identify batches
    const batchMap = new Map<string, {
      subject: string
      companyId: string
      companyName: string
      sentAt: string
      sent: number
      failed: number
      errors: string[]
    }>()

    for (const record of filteredData) {
      // Truncate to minute to group batch sends
      const sentDate = new Date(record.sent_at)
      const truncatedDate = new Date(
        sentDate.getFullYear(),
        sentDate.getMonth(),
        sentDate.getDate(),
        sentDate.getHours(),
        sentDate.getMinutes()
      ).toISOString()

      const batchKey = `${record.company_id}:${record.email_subject}:${truncatedDate}`

      if (!batchMap.has(batchKey)) {
        batchMap.set(batchKey, {
          subject: record.email_subject,
          companyId: record.company_id,
          companyName: companiesMap.get(record.company_id) || "Desconhecido",
          sentAt: truncatedDate,
          sent: 0,
          failed: 0,
          errors: [],
        })
      }

      const batch = batchMap.get(batchKey)!
      if (record.status === "sent") {
        batch.sent++
      } else {
        batch.failed++
        if (record.error_message) {
          batch.errors.push(record.error_message)
        }
      }
    }

    // Convert to array and sort by date
    const batches: EmailBatch[] = Array.from(batchMap.values())
      .map(b => ({
        subject: b.subject,
        companyId: b.companyId,
        companyName: b.companyName,
        sentAt: b.sentAt,
        totalSent: b.sent,
        totalFailed: b.failed,
      }))
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())

    // Calculate summary stats
    const totalEmails = filteredData.length
    const totalSent = filteredData.filter(d => d.status === "sent").length
    const totalFailed = filteredData.filter(d => d.status === "failed").length

    return NextResponse.json({
      companies: companiesData || [],
      summary: {
        total: totalEmails,
        sent: totalSent,
        failed: totalFailed,
        sentRate: totalEmails > 0 ? (totalSent / totalEmails) * 100 : 0,
        failedRate: totalEmails > 0 ? (totalFailed / totalEmails) * 100 : 0,
      },
      batches,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: parseInt(period),
      },
    }, { headers: noCacheHeaders })
  } catch (error: unknown) {
    console.error("[Email Stats] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
