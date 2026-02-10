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
  totalSent: number
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

    // 1. Fetch local tracking data with recipient emails
    // We need to join email_sent_tracking with company_email_recipients to get emails
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

    console.log(`[Email Analytics] Found ${trackingData?.length || 0} tracking records`)

    // 2. Collect all recipient emails from tracking data and track duplicates
    const emailToRecipient = new Map<string, { clientName: string; userId: string }>()
    const allEmails = new Set<string>()

    // Track all sends per email to identify duplicates
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

    // Calculate global duplicates
    const totalSends = trackingData?.length || 0
    const uniqueEmailsCount = allEmails.size
    const globalDuplicates = totalSends - uniqueEmailsCount

    console.log(`[Email Analytics] Total sends: ${totalSends}, Unique emails: ${uniqueEmailsCount}, Duplicates: ${globalDuplicates}`)

    // 3. Fetch SendGrid suppression data
    const apiKey = process.env.SENDGRID_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "SENDGRID_API_KEY nao configurada" },
        { status: 500, headers: noCacheHeaders }
      )
    }

    const [bounces, blocks, invalidEmails, spamReports] = await Promise.all([
      fetchSendGridSuppression(apiKey, "bounces", startTime, endTime),
      fetchSendGridSuppression(apiKey, "blocks", startTime, endTime),
      fetchSendGridSuppression(apiKey, "invalid_emails", startTime, endTime),
      fetchSendGridSuppression(apiKey, "spam_reports", startTime, endTime),
    ])

    console.log(`[Email Analytics] SendGrid failures - bounces: ${bounces.length}, blocks: ${blocks.length}, invalid: ${invalidEmails.length}, spam: ${spamReports.length}`)

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

      const totalSent = group.records.length
      const totalFailed = batchBounces.length + batchBlocks.length + batchInvalid.length
      const delivered = totalSent - totalFailed

      // Find duplicates in this batch (emails that were sent to more than once globally)
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

          // Check if this email was sent to more than once (globally)
          if (history.length > 1) {
            // Get previous sends (excluding current batch)
            const previousSends = history
              .filter(h => !(h.date === group.date && h.subject === group.subject))
              .map(h => ({ date: h.date, subject: h.subject }))

            if (previousSends.length > 0) {
              batchDuplicates.push({
                email,
                clientName: record.clientName,
                timesSent: history.length,
                previousSends,
              })
            }
          }
        }
      }

      const duplicatesInBatch = totalSent - uniqueInBatch

      batches.push({
        id: key,
        subject: group.subject,
        companyId: group.companyId,
        companyName: group.companyName,
        sentAt: group.sentAt,
        date: group.date,
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

    // 7. Calculate summary totals
    const totalSentSum = batches.reduce((sum, b) => sum + b.totalSent, 0)
    const bouncesSum = batches.reduce((sum, b) => sum + b.bounces.length, 0)
    const blocksSum = batches.reduce((sum, b) => sum + b.blocks.length, 0)
    const invalidSum = batches.reduce((sum, b) => sum + b.invalid.length, 0)
    const spamSum = batches.reduce((sum, b) => sum + b.spam.length, 0)

    const summary = {
      totalSent: totalSentSum,
      uniqueEmails: uniqueEmailsCount,
      duplicates: globalDuplicates,
      delivered: totalSentSum - bouncesSum - blocksSum - invalidSum,
      bounces: bouncesSum,
      blocks: blocksSum,
      invalid: invalidSum,
      spam: spamSum,
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
