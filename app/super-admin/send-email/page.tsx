import { createAdminClient } from "@/lib/supabase/server"
import { SendEmailPageClient } from "@/components/super-admin/send-email-page-client"
import { PAID_AGREEMENT_STATUSES, PAID_ASAAS_STATUSES, PAID_PAYMENT_STATUSES, PAID_VMAX_STATUSES } from "@/lib/constants/payment-status"

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
      .select('id, Email, "CPF/CNPJ", "Dias Inad.", id_company, negotiation_status')
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

  // Fetch agreements to identify paid clients
  let allAgreements: any[] = []
  page = 0
  hasMore = true

  while (hasMore) {
    const { data: agreementsPage, error: agreementsError } = await supabase
      .from("agreements")
      .select("id, customer_id, company_id, status, asaas_status, payment_status")
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (agreementsError) {
      console.error("[v0] Error fetching agreements:", agreementsError)
      break
    }

    if (agreementsPage && agreementsPage.length > 0) {
      allAgreements = [...allAgreements, ...agreementsPage]
      page++
      hasMore = agreementsPage.length === pageSize
    } else {
      hasMore = false
    }
  }

  console.log("[v0] Fetched", allAgreements.length, "agreements")

  // Fetch customers to map customer_id to document (CPF/CNPJ)
  const { data: customers } = await supabase
    .from("customers")
    .select("id, document, company_id")

  // Build customer ID to document map
  const customerIdToDoc = new Map<string, string>()
  for (const c of customers || []) {
    if (c.document) {
      customerIdToDoc.set(c.id, c.document.replace(/\D/g, ""))
    }
  }

  // Build set of paid CPF/CNPJs by company
  const paidDocsByCompany = new Map<string, Set<string>>()
  for (const a of allAgreements) {
    const isPaid =
      PAID_AGREEMENT_STATUSES.includes(a.status) ||
      PAID_PAYMENT_STATUSES.includes(a.payment_status) ||
      PAID_ASAAS_STATUSES.includes(a.asaas_status)

    if (isPaid) {
      const doc = customerIdToDoc.get(a.customer_id)
      if (doc && a.company_id) {
        if (!paidDocsByCompany.has(a.company_id)) {
          paidDocsByCompany.set(a.company_id, new Set())
        }
        paidDocsByCompany.get(a.company_id)!.add(doc)
      }
    }
  }

  // Also check VMAX negotiation_status = PAGO
  const paidVmaxDocs = new Map<string, Set<string>>()
  for (const v of vmaxData) {
    if (PAID_VMAX_STATUSES.includes(v.negotiation_status)) {
      const doc = (v["CPF/CNPJ"] || "").replace(/\D/g, "")
      const companyId = v.id_company
      if (doc && companyId) {
        if (!paidVmaxDocs.has(companyId)) {
          paidVmaxDocs.set(companyId, new Set())
        }
        paidVmaxDocs.get(companyId)!.add(doc)
      }
    }
  }

  // Build email to CPF/CNPJ map from VMAX (to check if recipient's debt is paid)
  const emailToDocMap = new Map<string, { doc: string; companyId: string }>()
  for (const v of vmaxData) {
    const email = (v.Email || "").toLowerCase().trim()
    const doc = (v["CPF/CNPJ"] || "").replace(/\D/g, "")
    const companyId = v.id_company
    if (email && doc && companyId) {
      const key = `${companyId}:${email}`
      emailToDocMap.set(key, { doc, companyId })
    }
  }

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

  // Group recipients by company, EXCLUDING clients with paid debts
  const recipientsMap: Record<string, { id: string; name: string; email: string; daysOverdue: number }[]> = {}
  let excludedPaidCount = 0

  for (const recipient of allRecipients) {
    const email = recipient.client_email.toLowerCase().trim()
    const key = `${recipient.company_id}:${email}`

    // Check if this recipient's debt is paid
    const docInfo = emailToDocMap.get(key)
    if (docInfo) {
      const companyPaidDocs = paidDocsByCompany.get(docInfo.companyId) || new Set()
      const companyPaidVmax = paidVmaxDocs.get(docInfo.companyId) || new Set()

      if (companyPaidDocs.has(docInfo.doc) || companyPaidVmax.has(docInfo.doc)) {
        // Skip this recipient - their debt is paid
        excludedPaidCount++
        continue
      }
    }

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

  console.log("[v0] Excluded", excludedPaidCount, "recipients with paid debts")

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
        <h1 className="text-3xl font-bold tracking-tight">Central de Emails</h1>
        <p className="text-muted-foreground">
          Envie emails em massa e acompanhe as estatisticas de entrega.
        </p>
      </div>

      {/* Tabs */}
      <SendEmailPageClient
        companies={companies}
        recipientsMap={recipientsMap}
        emailTrackingMap={emailTrackingMap}
      />
    </div>
  )
}
