import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminAcordosContent } from "@/components/dashboard/admin-acordos-content"
import { PAID_AGREEMENT_STATUSES, PAID_PAYMENT_STATUSES, PAID_ASAAS_STATUSES } from "@/lib/constants/payment-status"

export const dynamic = "force-dynamic"

interface AgreementCustomer {
  id: string
  name: string
  document: string
  totalDebt: number
  daysOverdue: number
  hasNegotiation: boolean
  isPaid: boolean
  isCancelled: boolean
  agreementId: string | null
  agreedAmount: number
  installments: number
  status: string
  paymentStatus: string | null
  asaasStatus: string | null
  createdAt: string | null
  dueDate: string | null
}

export default async function AgreementsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.company_id) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">
          Sua conta não está vinculada a nenhuma empresa.
        </p>
      </div>
    )
  }

  const companyId = profile.company_id

  // Step 1: Fetch ALL VMAX customers for this company with pagination
  let vmaxRecords: any[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data: pageData } = await supabase
      .from("VMAX")
      .select("*")
      .eq("id_company", companyId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!pageData || pageData.length === 0) break
    vmaxRecords = [...vmaxRecords, ...pageData]
    if (pageData.length < pageSize) break
    page++
  }

  // Step 2: Fetch all agreements for this company with pagination
  let allAgreements: any[] = []
  page = 0

  while (true) {
    const { data: pageData } = await supabase
      .from("agreements")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!pageData || pageData.length === 0) break
    allAgreements = [...allAgreements, ...pageData]
    if (pageData.length < pageSize) break
    page++
  }

  // Step 3: Fetch customers table to map customer_id -> document
  const customerIds = [...new Set(allAgreements.map(a => a.customer_id).filter(Boolean))]
  const customerDocMap = new Map<string, string>()

  if (customerIds.length > 0) {
    // Paginate customer fetches too
    for (let i = 0; i < customerIds.length; i += 500) {
      const batch = customerIds.slice(i, i + 500)
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, document")
        .in("id", batch)

      if (customersData) {
        customersData.forEach((c: any) => {
          const normalizedDoc = (c.document || "").replace(/\D/g, "")
          if (normalizedDoc) {
            customerDocMap.set(c.id, normalizedDoc)
          }
        })
      }
    }
  }

  // Step 4: Build maps from normalized document -> agreement info
  // This matches Super Admin's logic exactly - KEY BY DOCUMENT, not customer_id
  const docToAgreements = new Map<string, any[]>()

  for (const a of allAgreements) {
    const normalizedDoc = customerDocMap.get(a.customer_id)
    if (!normalizedDoc) continue

    if (!docToAgreements.has(normalizedDoc)) {
      docToAgreements.set(normalizedDoc, [])
    }
    docToAgreements.get(normalizedDoc)!.push(a)
  }

  // Step 5: For each VMAX customer, determine negotiation status
  // This matches Super Admin's hasNegotiation logic exactly
  const customersWithNegotiations: AgreementCustomer[] = []

  for (const vmax of vmaxRecords) {
    const cpfCnpj = (vmax["CPF/CNPJ"] || "").replace(/\D/g, "")
    const customerAgreements = docToAgreements.get(cpfCnpj) || []

    // Filter to non-cancelled agreements
    const activeAgreements = customerAgreements.filter(a => a.status !== "cancelled")
    const cancelledAgreements = customerAgreements.filter(a => a.status === "cancelled")

    // Check if has any non-cancelled agreement (matches Super Admin's hasNegotiation)
    const hasNegotiation = activeAgreements.length > 0

    // Only include customers who have negotiations
    if (!hasNegotiation) continue

    // Get the latest active agreement for this customer
    const latestAgreement = activeAgreements[0]

    // Check if paid - use all paid status indicators
    const isPaid = activeAgreements.some(a =>
      PAID_AGREEMENT_STATUSES.includes(a.status) ||
      PAID_PAYMENT_STATUSES.includes(a.payment_status) ||
      PAID_ASAAS_STATUSES.includes(a.asaas_status)
    )

    // Check if was cancelled but has no active agreement (can send new)
    const isCancelled = cancelledAgreements.length > 0 && activeAgreements.length === 0

    // Parse debt value
    const vencidoStr = String(vmax.Vencido || "0")
    const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    const totalDebt = Number(cleanValue) || 0

    const diasInadStr = String(vmax["Dias Inad."] || "0")
    const daysOverdue = Number(diasInadStr.replace(/\./g, "")) || 0

    customersWithNegotiations.push({
      id: vmax.id,
      name: vmax.Cliente || "Cliente",
      document: vmax["CPF/CNPJ"] || "N/A",
      totalDebt,
      daysOverdue: isPaid ? 0 : daysOverdue,
      hasNegotiation: true,
      isPaid,
      isCancelled,
      agreementId: latestAgreement?.id || null,
      agreedAmount: Number(latestAgreement?.agreed_amount) || 0,
      installments: latestAgreement?.installments || 1,
      status: latestAgreement?.status || "active",
      paymentStatus: latestAgreement?.payment_status || null,
      asaasStatus: latestAgreement?.asaas_status || null,
      createdAt: latestAgreement?.created_at || null,
      dueDate: latestAgreement?.due_date || null,
    })
  }

  // Calculate stats
  const totalCount = customersWithNegotiations.length
  const totalAgreedValue = customersWithNegotiations.reduce((sum, c) => sum + c.agreedAmount, 0)
  const completedValue = customersWithNegotiations
    .filter(c => c.isPaid)
    .reduce((sum, c) => sum + c.agreedAmount, 0)
  const averageInstallments = totalCount > 0
    ? customersWithNegotiations.reduce((sum, c) => sum + c.installments, 0) / totalCount
    : 0

  return (
    <AdminAcordosContent
      customers={customersWithNegotiations}
      stats={{
        totalCount,
        totalAgreedValue,
        completedValue,
        averageInstallments,
      }}
    />
  )
}
