import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
}

interface SuppressionRecord {
  email: string
  reason: string
  status?: string
  created: number
}

interface EnrichedFailure {
  email: string
  reason: string
  type: "bounce" | "block" | "invalid" | "spam"
  createdAt: string
  clientName?: string
}

interface DuplicateInfo {
  email: string
  clientName: string
  timesSent: number
  previousSends: Array<{
    date: string
    subject: string
  }>
}

interface BatchSummary {
  id: string
  subject: string
  companyId: string
  companyName: string
  sentAt: string
  date: string
  localAttempts: number // How many we tried to send (local DB)
  totalSent: number // How many SendGrid received (from stats)
  uniqueInBatch: number
  duplicatesInBatch: number
  delivered: number
  deliveryRate: string
  bounces: EnrichedFailure[]
  blocks: EnrichedFailure[]
  invalid: EnrichedFailure[]
  spam: EnrichedFailure[]
  duplicates: DuplicateInfo[]
}

interface SendGridDayStats {
  date: string
  stats: Array<{
    metrics: {
      requests: number
      delivered: number
      bounces: number
      blocks: number
      spam_reports: number
      invalid_emails: number
      opens: number
      clicks: number
      unique_opens: number
      unique_clicks: number
    }
  }>
}

async function fetchSendGridStats(
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<SendGridDayStats[]> {
  try {
    const response = await fetch(
      `https://api.sendgrid.com/v3/stats?start_date=${startDate}&end_date=${endDate}&aggregated_by=day`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    )
    if (!response.ok) {
      console.error(`[Email Analytics] Failed to fetch stats:`, response.status)
      return []
    }
    return await response.json()
  } catch (error) {
    console.error(`[Email Analytics] Error fetching stats:`, error)
    return []
  }
}

async function fetchSendGridSuppression(
  apiKey: string,
  endpoint: string,
  startTime: number,
  endTime: number
): Promise<SuppressionRecord[]> {
  try {
    const response = await fetch(
      `https://api.sendgrid.com/v3/suppression/${endpoint}?start_time=${startTime}&end_time=${endTime}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    )
    if (!response.ok) {
      console.error(`[Email Analytics] Failed to fetch ${endpoint}:`, response.status)
      return []
    }
    return await response.json()
  } catch (error) {
    console.error(`[Email Analytics] Error fetching ${endpoint}:`, error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify the user is a super admin
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401, headers: noCacheHeaders })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403, headers: noCacheHeaders })
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const period = parseInt(searchParams.get("period") || "30")
    const companyId = searchParams.get("companyId") || null
    const subjectFilter = searchParams.get("subject") || null

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)

    const startTime = Math.floor(startDate.getTime() / 1000)
    const endTime = Math.floor(endDate.getTime() / 1000)

    console.log(`[Email Analytics] Fetching data for period: ${period} days, company: ${companyId || "all"}, subject: ${subjectFilter || "all"}`)

    const adminClient = createAdminClient()

    // Get SendGrid API key first
    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "SENDGRID_API_KEY nao configurada" },
        { status: 500, headers: noCacheHeaders }
      )
    }

    // Format dates for SendGrid API (YYYY-MM-DD)
    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = endDate.toISOString().split("T")[0]

    // 1. Fetch SendGrid Stats API - THIS IS THE SOURCE OF TRUTH for delivery metrics
    const sendgridStats = await fetchSendGridStats(apiKey, startDateStr, endDateStr)
    console.log(`[Email Analytics] SendGrid stats received for ${sendgridStats.length} days`)

    // Aggregate SendGrid stats for summary
    const sendgridTotals = sendgridStats.reduce(
      (acc, day) => {
        const metrics = day.stats[0]?.metrics || {
          requests: 0,
          delivered: 0,
          bounces: 0,
          blocks: 0,
          spam_reports: 0,
          invalid_emails: 0,
        }
        acc.requests += metrics.requests
        acc.delivered += metrics.delivered
        acc.bounces += metrics.bounces
        acc.blocks += metrics.blocks
        acc.spam += metrics.spam_reports
        acc.invalid += metrics.invalid_emails
        return acc
      },
      { requests: 0, delivered: 0, bounces: 0, blocks: 0, spam: 0, invalid: 0 }
    )

    console.log(`[Email Analytics] SendGrid totals:`, sendgridTotals)

    // Create a map of date -> SendGrid stats for per-batch enrichment
    const sendgridStatsByDate = new Map<string, { requests: number; delivered: number; bounces: number; blocks: number }>()
    for (const day of sendgridStats) {
      const metrics = day.stats[0]?.metrics
      if (metrics) {
        sendgridStatsByDate.set(day.date, {
          requests: metrics.requests,
          delivered: metrics.delivered,
          bounces: metrics.bounces,
          blocks: metrics.blocks,
        })
      }
    }

    // 2. Fetch local tracking data for enrichment (company names, subjects, duplicates)
    // Note: Local data is NOT used for delivery counts - only for metadata
    let trackingQuery = adminClient
      .from("email_sent_tracking")
      .select(`
        id,
        user_id,
        company_id,
        email_subject,
        sent_at,
        status,
        error_message,
        company_email_recipients!inner (
          id,
          client_email,
          client_name
        ),
        companies!inner (
          id,
          name
        )
      `)
      .gte("sent_at", startDate.toISOString())
      .lte("sent_at", endDate.toISOString())
      .eq("status", "sent") // Only count confirmed sends for duplicates
      .order("sent_at", { ascending: false })

    // Apply filters
    if (companyId) {
      trackingQuery = trackingQuery.eq("company_id", companyId)
    }
    if (subjectFilter) {
      trackingQuery = trackingQuery.eq("email_subject", subjectFilter)
    }

    const { data: trackingData, error: trackingError } = await trackingQuery

    if (trackingError) {
      console.error("[Email Analytics] Error fetching tracking:", trackingError)
      return NextResponse.json(
        { error: "Erro ao buscar dados de rastreamento" },
        { status: 500, headers: noCacheHeaders }
      )
    }

    console.log(`[Email Analytics] Found ${trackingData?.length || 0} local tracking records (confirmed sends only)`)

    // 3. Collect recipient emails for duplicate detection (only from confirmed sends)
    const emailToRecipient = new Map<string, { clientName: string; userId: string }>()
    const allEmails = new Set<string>()

    // Track send history per email for duplicate detection
    const emailSendHistory = new Map<string, Array<{
      date: string
      subject: string
      sentAt: string
    }>>()

    for (const record of trackingData || []) {
      const recipient = record.company_email_recipients as { client_email: string; client_name: string } | null
      if (recipient?.client_email) {
        const email = recipient.client_email.toLowerCase().trim()
        allEmails.add(email)
        emailToRecipient.set(email, {
          clientName: recipient.client_name || email,
          userId: record.user_id,
        })

        // Track send history for this email
        if (!emailSendHistory.has(email)) {
          emailSendHistory.set(email, [])
        }
        emailSendHistory.get(email)!.push({
          date: record.sent_at.split("T")[0],
          subject: record.email_subject,
          sentAt: record.sent_at,
        })
      }
    }

    // Calculate duplicates from LOCAL confirmed sends only
    const localConfirmedSends = trackingData?.length || 0
    const uniqueEmailsCount = allEmails.size
    const globalDuplicates = localConfirmedSends - uniqueEmailsCount

    console.log(`[Email Analytics] Local confirmed: ${localConfirmedSends}, Unique emails: ${uniqueEmailsCount}, Duplicates: ${globalDuplicates}`)

    // 4. Fetch SendGrid suppression data for failure details
    const [bounces, blocks, invalidEmails, spamReports] = await Promise.all([
      fetchSendGridSuppression(apiKey, "bounces", startTime, endTime),
      fetchSendGridSuppression(apiKey, "blocks", startTime, endTime),
      fetchSendGridSuppression(apiKey, "invalid_emails", startTime, endTime),
      fetchSendGridSuppression(apiKey, "spam_reports", startTime, endTime),
    ])

    console.log(`[Email Analytics] SendGrid suppression - bounces: ${bounces.length}, blocks: ${blocks.length}, invalid: ${invalidEmails.length}, spam: ${spamReports.length}`)

    // 4. Filter SendGrid failures to ONLY include emails that are in our tracked sends
    const matchedBounces = bounces.filter(b => allEmails.has(b.email.toLowerCase().trim()))
    const matchedBlocks = blocks.filter(b => allEmails.has(b.email.toLowerCase().trim()))
    const matchedInvalid = invalidEmails.filter(i => allEmails.has(i.email.toLowerCase().trim()))
    const matchedSpam = spamReports.filter(s => allEmails.has(s.email.toLowerCase().trim()))

    console.log(`[Email Analytics] Matched failures - bounces: ${matchedBounces.length}, blocks: ${matchedBlocks.length}, invalid: ${matchedInvalid.length}, spam: ${matchedSpam.length}`)

    // Create lookup sets for quick failure check
    const bouncedEmails = new Set(matchedBounces.map(b => b.email.toLowerCase().trim()))
    const blockedEmails = new Set(matchedBlocks.map(b => b.email.toLowerCase().trim()))
    const invalidEmailSet = new Set(matchedInvalid.map(i => i.email.toLowerCase().trim()))
    const spamEmails = new Set(matchedSpam.map(s => s.email.toLowerCase().trim()))

    // Create lookup maps for failure details
    const bounceDetails = new Map(matchedBounces.map(b => [b.email.toLowerCase().trim(), b]))
    const blockDetails = new Map(matchedBlocks.map(b => [b.email.toLowerCase().trim(), b]))
    const invalidDetails = new Map(matchedInvalid.map(i => [i.email.toLowerCase().trim(), i]))
    const spamDetails = new Map(matchedSpam.map(s => [s.email.toLowerCase().trim(), s]))

    // 5. Group tracking data by subject + date + company for batch summaries
    const batchGroups = new Map<string, {
      subject: string
      companyId: string
      companyName: string
      date: string
      sentAt: string
      records: Array<{
        email: string
        clientName: string
        status: string
      }>
    }>()

    for (const record of trackingData || []) {
      const recipient = record.company_email_recipients as { client_email: string; client_name: string } | null
      const company = record.companies as { id: string; name: string } | null

      if (!recipient?.client_email || !company) continue

      const email = recipient.client_email.toLowerCase().trim()
      // Group by subject + date (YYYY-MM-DD) + company
      const sentDate = record.sent_at.split("T")[0]
      const groupKey = `${record.email_subject}|${sentDate}|${record.company_id}`

      if (!batchGroups.has(groupKey)) {
        batchGroups.set(groupKey, {
          subject: record.email_subject,
          companyId: record.company_id,
          companyName: company.name,
          date: sentDate,
          sentAt: record.sent_at,
          records: [],
        })
      }

      batchGroups.get(groupKey)!.records.push({
        email,
        clientName: recipient.client_name || email,
        status: record.status,
      })
    }

    // 6. Build batch summaries with cross-referenced failure data
    const batches: BatchSummary[] = []

    for (const [key, group] of batchGroups) {
      const batchEmails = new Set(group.records.map(r => r.email))

      // Filter failures for this specific batch
      const batchBounces: EnrichedFailure[] = []
      const batchBlocks: EnrichedFailure[] = []
      const batchInvalid: EnrichedFailure[] = []
      const batchSpam: EnrichedFailure[] = []

      for (const record of group.records) {
        const email = record.email

        if (bouncedEmails.has(email)) {
          const detail = bounceDetails.get(email)
          batchBounces.push({
            email,
            reason: detail?.reason || "Sem motivo informado",
            type: "bounce",
            createdAt: detail ? new Date(detail.created * 1000).toISOString() : group.sentAt,
            clientName: record.clientName,
          })
        }

        if (blockedEmails.has(email)) {
          const detail = blockDetails.get(email)
          batchBlocks.push({
            email,
            reason: detail?.reason || "Sem motivo informado",
            type: "block",
            createdAt: detail ? new Date(detail.created * 1000).toISOString() : group.sentAt,
            clientName: record.clientName,
          })
        }

        if (invalidEmailSet.has(email)) {
          const detail = invalidDetails.get(email)
          batchInvalid.push({
            email,
            reason: detail?.reason || "Email invalido",
            type: "invalid",
            createdAt: detail ? new Date(detail.created * 1000).toISOString() : group.sentAt,
            clientName: record.clientName,
          })
        }

        if (spamEmails.has(email)) {
          const detail = spamDetails.get(email)
          batchSpam.push({
            email,
            reason: "Marcado como spam",
            type: "spam",
            createdAt: detail ? new Date(detail.created * 1000).toISOString() : group.sentAt,
            clientName: record.clientName,
          })
        }
      }

      // Local attempts from our tracking data
      const localAttempts = group.records.length

      // Get SendGrid stats for this specific date
      const dayStats = sendgridStatsByDate.get(group.date)

      // Use SendGrid numbers if available, otherwise estimate from local
      // Note: When filtering by company/subject, we can't get per-filter SendGrid stats
      // so we use local data as proxy but show SendGrid totals in summary
      const totalSent = dayStats?.requests || localAttempts
      const totalFailed = batchBounces.length + batchBlocks.length + batchInvalid.length
      const delivered = dayStats?.delivered || (localAttempts - totalFailed)

      // Find duplicates in this batch (emails that were sent more than once globally)
      const batchDuplicates: DuplicateInfo[] = []
      const batchEmailSet = new Set<string>()
      let uniqueInBatch = 0

      for (const record of group.records) {
        const email = record.email
        const history = emailSendHistory.get(email) || []

        // Count unique emails in this batch
        if (!batchEmailSet.has(email)) {
          batchEmailSet.add(email)
          uniqueInBatch++

          // Check if this email was sent more than once (globally across all batches)
          if (history.length > 1) {
            // Show ALL sends for this email (sorted by date)
            const allSends = history
              .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
              .map(h => ({ date: h.sentAt, subject: h.subject }))

            batchDuplicates.push({
              email,
              clientName: record.clientName,
              timesSent: history.length,
              previousSends: allSends,
            })
          }
        }
      }

      const duplicatesInBatch = localAttempts - uniqueInBatch

      batches.push({
        id: key,
        subject: group.subject,
        companyId: group.companyId,
        companyName: group.companyName,
        sentAt: group.sentAt,
        date: group.date,
        localAttempts,
        totalSent,
        uniqueInBatch,
        duplicatesInBatch,
        delivered,
        deliveryRate: totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) : "0.0",
        bounces: batchBounces,
        blocks: batchBlocks,
        invalid: batchInvalid,
        spam: batchSpam,
        duplicates: batchDuplicates,
      })
    }

    // Sort batches by date descending
    batches.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())

    // 7. Calculate summary totals - USE SENDGRID AS SOURCE OF TRUTH
    // Local data is only used for unique/duplicate counts
    const summary = {
      // FROM SENDGRID STATS API (source of truth)
      totalSent: sendgridTotals.requests,
      delivered: sendgridTotals.delivered,
      bounces: sendgridTotals.bounces,
      blocks: sendgridTotals.blocks,
      invalid: sendgridTotals.invalid,
      spam: sendgridTotals.spam,
      // FROM LOCAL DB (for duplicate detection only)
      uniqueEmails: uniqueEmailsCount,
      duplicates: globalDuplicates,
      // Additional context
      localAttempts: localConfirmedSends, // How many we tried to send (local)
    }

    // 8. Fetch available companies (that have sent emails)
    const { data: availableCompanies } = await adminClient
      .from("email_sent_tracking")
      .select("company_id, companies!inner(id, name)")
      .gte("sent_at", startDate.toISOString())

    const companiesMap = new Map<string, string>()
    for (const row of availableCompanies || []) {
      const company = row.companies as { id: string; name: string } | null
      if (company) {
        companiesMap.set(company.id, company.name)
      }
    }

    const companies = Array.from(companiesMap.entries()).map(([id, name]) => ({ id, name }))
    companies.sort((a, b) => a.name.localeCompare(b.name))

    // 9. Fetch available subjects (optionally filtered by company)
    let subjectsQuery = adminClient
      .from("email_sent_tracking")
      .select("email_subject")
      .gte("sent_at", startDate.toISOString())
      .order("sent_at", { ascending: false })

    if (companyId) {
      subjectsQuery = subjectsQuery.eq("company_id", companyId)
    }

    const { data: subjectsData } = await subjectsQuery

    const subjectsSet = new Set<string>()
    for (const row of subjectsData || []) {
      if (row.email_subject) {
        subjectsSet.add(row.email_subject)
      }
    }
    const subjects = Array.from(subjectsSet)

    return NextResponse.json({
      summary,
      batches,
      companies,
      subjects,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: period,
      },
    }, { headers: noCacheHeaders })
  } catch (error: unknown) {
    console.error("[Email Analytics] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
