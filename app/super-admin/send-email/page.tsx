import { createAdminClient } from "@/lib/supabase/server"
import { SendEmailForm } from "@/components/super-admin/send-email-form"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface EmailRecipient {
  id: string
  client_name: string | null
  client_email: string
  company_id: string
  daysOverdue?: number
}

interface EmailTrackingRecord {
  id: string
  user_id: string
  sent_at: string
  status: "sent" | "failed"
  email_subject: string
}

async function fetchData() {
  console.log("[v0] ========== SEND EMAIL PAGE ==========")

  const supabase = createAdminClient()

  // Fetch all companies
  const { data: companiesData, error: companiesError } = await supabase
    .from("companies")
    .select("id, name")
    .order("name")

  if (companiesError) {
    console.error("[v0] Error fetching companies:", companiesError)
    return { companies: [], recipientsMap: {}, emailTrackingMap: {} }
  }

  console.log("[v0] Fetched", companiesData?.length || 0, "companies")

  // Fetch all email recipients from the new table
  let allRecipients: EmailRecipient[] = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data: recipientsPage, error: recipientsError } = await supabase
      .from("company_email_recipients")
      .select("id, client_name, client_email, company_id")
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (recipientsError) {
      console.error("[v0] Error fetching email recipients:", recipientsError)
      break
    }

    if (recipientsPage && recipientsPage.length > 0) {
      allRecipients = [...allRecipients, ...recipientsPage]
      page++
      hasMore = recipientsPage.length === pageSize
    } else {
      hasMore = false
    }
  }

  console.log("[v0] Fetched", allRecipients.length, "email recipients")

  // Fetch VMAX data to get debt days (Dias Inad.)
  let vmaxData: any[] = []
  page = 0
  hasMore = true

  while (hasMore) {
    const { data: vmaxPage, error: vmaxError } = await supabase
      .from("VMAX")
      .select('id, Email, "CPF/CNPJ", "Dias Inad.", id_company')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (vmaxError) {
      console.error("[v0] Error fetching VMAX:", vmaxError)
      break
    }

    if (vmaxPage && vmaxPage.length > 0) {
      vmaxData = [...vmaxData, ...vmaxPage]
      page++
      hasMore = vmaxPage.length === pageSize
    } else {
      hasMore = false
    }
  }

  console.log("[v0] Fetched", vmaxData.length, "VMAX records for debt days")

  // Create a map of email -> max days overdue (by company)
  const emailToDaysMap = new Map<string, number>()
  for (const v of vmaxData) {
    const email = (v.Email || "").toLowerCase().trim()
    const companyId = v.id_company
    if (email && companyId) {
      const diasInadStr = String(v["Dias Inad."] || "0")
      const diasInad = Number(diasInadStr.replace(/\./g, "")) || 0
      // Use company_id + email as key to handle same email in different companies
      const key = `${companyId}:${email}`
      // Keep the max days overdue if there are multiple records
      const existing = emailToDaysMap.get(key) || 0
      if (diasInad > existing) {
        emailToDaysMap.set(key, diasInad)
      }
    }
  }

  // Enrich recipients with debt days
  for (const recipient of allRecipients) {
    const email = recipient.client_email.toLowerCase().trim()
    const key = `${recipient.company_id}:${email}`
    recipient.daysOverdue = emailToDaysMap.get(key) || 0
  }

  // Fetch email tracking data - get the latest successful send for each user
  let allTracking: EmailTrackingRecord[] = []
  page = 0
  hasMore = true

  while (hasMore) {
    const { data: trackingPage, error: trackingError } = await supabase
      .from("email_sent_tracking")
      .select("id, user_id, sent_at, status, email_subject")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (trackingError) {
      console.error("[v0] Error fetching email tracking:", trackingError)
      // Continue even if tracking table doesn't exist yet
      break
    }

    if (trackingPage && trackingPage.length > 0) {
      allTracking = [...allTracking, ...trackingPage]
      page++
      hasMore = trackingPage.length === pageSize
    } else {
      hasMore = false
    }
  }

  console.log("[v0] Fetched", allTracking.length, "tracking records")

  // Create a map of user_id -> email tracking data with history
  const emailTrackingMap: Record<string, {
    sentAt: string
    subject: string
    status: string
    history: Array<{ sentAt: string; subject: string; status: string }>
  }> = {}

  for (const record of allTracking) {
    if (!emailTrackingMap[record.user_id]) {
      // First record is the latest (ordered by sent_at DESC)
      emailTrackingMap[record.user_id] = {
        sentAt: record.sent_at,
        subject: record.email_subject,
        status: record.status,
        history: [],
      }
    }
    // Add to history (all records for this user)
    emailTrackingMap[record.user_id].history.push({
      sentAt: record.sent_at,
      subject: record.email_subject,
      status: record.status,
    })
  }

  console.log("[v0] Created tracking map for", Object.keys(emailTrackingMap).length, "users")

  // Group recipients by company
  const recipientsMap: Record<string, { id: string; name: string; email: string; daysOverdue: number }[]> = {}
  for (const recipient of allRecipients) {
    if (!recipientsMap[recipient.company_id]) {
      recipientsMap[recipient.company_id] = []
    }
    recipientsMap[recipient.company_id].push({
      id: recipient.id,
      name: recipient.client_name || recipient.client_email,
      email: recipient.client_email,
      daysOverdue: recipient.daysOverdue || 0,
    })
  }

  console.log("[v0] ========== END SEND EMAIL PAGE ==========")

  return {
    companies: companiesData || [],
    recipientsMap,
    emailTrackingMap,
  }
}

export default async function SendEmailPage() {
  const { companies, recipientsMap, emailTrackingMap } = await fetchData()

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enviar Email</h1>
        <p className="text-muted-foreground">
          Envie emails em massa para clientes de uma empresa específica.
        </p>
      </div>

      {/* Form */}
      <SendEmailForm
        companies={companies}
        recipientsMap={recipientsMap}
        emailTrackingMap={emailTrackingMap}
      />
    </div>
  )
}
