import { createAdminClient } from "@/lib/supabase/admin"
import { SuperAdminClientesContent } from "./clientes-content"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SuperAdminClientesPage() {
  const supabase = createAdminClient()

  // Fetch all companies
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name")

  // Fetch all VMAX records (paginated to handle large datasets)
  let allVmaxRecords: any[] = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data: vmaxPage, error: vmaxPageError } = await supabase
      .from("VMAX")
      .select("*")
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (vmaxPageError) {
      console.error("VMAX page error:", vmaxPageError.message)
      break
    }

    if (vmaxPage && vmaxPage.length > 0) {
      allVmaxRecords = [...allVmaxRecords, ...vmaxPage]
      page++
      hasMore = vmaxPage.length === pageSize
    } else {
      hasMore = false
    }
  }

  // Fetch agreements for negotiation status
  const { data: agreements } = await supabase
    .from("agreements")
    .select("customer_id, status, payment_status, asaas_payment_id, company_id")

  // Build agreement status map
  const agreementStatusMap = new Map<string, { hasAgreement: boolean; isPaid: boolean; isActive: boolean; hasAsaasCharge: boolean }>()

  ;(agreements || []).forEach((a: any) => {
    const customerId = a.customer_id
    if (!customerId) return

    const existing = agreementStatusMap.get(customerId) || { hasAgreement: false, isPaid: false, isActive: false, hasAsaasCharge: false }
    existing.hasAgreement = true

    if (a.asaas_payment_id) {
      existing.hasAsaasCharge = true
    }

    if (a.payment_status === "received" || a.payment_status === "confirmed" || a.status === "completed") {
      existing.isPaid = true
    }

    if ((a.status === "active" || a.status === "draft") && a.payment_status !== "received" && a.payment_status !== "confirmed") {
      existing.isActive = true
    }

    agreementStatusMap.set(customerId, existing)
  })

  // Transform VMAX records to client format
  const clientes = allVmaxRecords.map((record: any) => {
    const vencidoStr = String(record.Vencido || "0")
    const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    const totalDebt = Number(cleanValue) || 0

    const diasInad = Number(String(record["Dias Inad."] || "0").replace(/\./g, "")) || 0

    const agreementStatus = agreementStatusMap.get(record.id)

    let negotiationStatus = "NENHUMA"
    if (agreementStatus?.isPaid) {
      negotiationStatus = "PAGO"
    } else if (agreementStatus?.isActive && agreementStatus?.hasAsaasCharge) {
      negotiationStatus = "ATIVA_ASAAS"
    } else if (agreementStatus?.isActive) {
      negotiationStatus = "ATIVA"
    } else if (agreementStatus?.hasAgreement) {
      negotiationStatus = "DRAFT"
    }

    return {
      id: record.id,
      name: record.Cliente || "N/A",
      document: record["CPF/CNPJ"] || "",
      email: record.Email || "",
      phone: record.Telefone || "",
      city: record.Cidade || "",
      state: record.UF || "",
      companyId: record.id_company,
      totalDebt,
      daysOverdue: diasInad,
      negotiationStatus,
      hasAsaasCharge: agreementStatus?.hasAsaasCharge || false,
      recoveryScore: record.recovery_score,
      recoveryClass: record.recovery_class,
      approvalStatus: record.approval_status,
    }
  })

  return (
    <SuperAdminClientesContent
      clientes={clientes}
      companies={companies || []}
    />
  )
}
