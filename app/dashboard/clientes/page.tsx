import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminClientesContent } from "@/components/dashboard/admin-clientes-content"
import { getAllBehavioralAnalyses } from "@/app/actions/get-all-behavioral-analyses"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      redirect("/auth/login")
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role, full_name")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return (
        <div
          className="p-6 rounded-xl"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <p style={{ color: "var(--admin-text-secondary)" }}>
            Empresa nao encontrada para o usuario
          </p>
        </div>
      )
    }

    const { data: company } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", profile.company_id)
      .single()

    // Fetch all VMAX records for this company
    let vmaxCustomers: any[] = []
    let page = 0
    const pageSize = 1000

    while (true) {
      const { data: pageData, error: vmaxError } = await supabase
        .from("VMAX")
        .select("*")
        .eq("id_company", profile.company_id)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (vmaxError || !pageData || pageData.length === 0) break
      vmaxCustomers = [...vmaxCustomers, ...pageData]
      if (pageData.length < pageSize) break
      page++
    }

    // Fetch agreements to determine actual ASAAS-backed negotiation status
    // Include due_date for the Vencimento column (ASAAS charge due date)
    const { data: agreements } = await supabase
      .from("agreements")
      .select("customer_id, status, payment_status, asaas_payment_id, due_date")
      .eq("company_id", profile.company_id)

    // Fetch customers to map external_id (VMAX ID) -> customer_id
    // This is needed because agreements.customer_id links to customers table, not VMAX directly
    const { data: customers } = await supabase
      .from("customers")
      .select("id, external_id")
      .eq("company_id", profile.company_id)
      .eq("source_system", "VMAX")

    // Build VMAX ID -> Customer ID map
    const vmaxToCustomerMap = new Map<string, string>()
    ;(customers || []).forEach((c: any) => {
      if (c.external_id) {
        vmaxToCustomerMap.set(c.external_id, c.id)
      }
    })

    // Build a map of customer_id -> agreement status (based on ASAAS data)
    // MUST MATCH Acordos page logic: count all non-cancelled agreements
    const agreementStatusMap = new Map<string, { hasAgreement: boolean; isPaid: boolean; isActive: boolean; hasAsaasCharge: boolean; isCancelled: boolean; hasActiveAgreement: boolean; paymentStatus: string | null; dueDate: string | null }>()

    ;(agreements || []).forEach((a: any) => {
      const customerId = a.customer_id
      if (!customerId) return

      const existing = agreementStatusMap.get(customerId) || { hasAgreement: false, isPaid: false, isActive: false, hasAsaasCharge: false, isCancelled: false, hasActiveAgreement: false, paymentStatus: null, dueDate: null }
      existing.hasAgreement = true

      // Track cancelled status - cancelled agreements mean customer is back to "Em aberto"
      if (a.status === "cancelled") {
        existing.isCancelled = true
        // Don't count cancelled as active or having ASAAS charge
        agreementStatusMap.set(customerId, existing)
        return
      }

      // NON-CANCELLED agreement = hasActiveAgreement (matches Acordos page logic)
      existing.hasActiveAgreement = true

      // Check if there's a real ASAAS charge (only for non-cancelled)
      if (a.asaas_payment_id) {
        existing.hasAsaasCharge = true
      }

      // Store the actual ASAAS payment_status (e.g. "pending", "received", "overdue", "confirmed")
      // This is the authoritative source for debt status display
      if (a.payment_status) {
        existing.paymentStatus = a.payment_status
      }

      // Store ASAAS due_date for Vencimento column (only for non-cancelled agreements with ASAAS charge)
      // This is the ASAAS charge due date, not the original VMAX debt date
      if (a.due_date && a.asaas_payment_id) {
        existing.dueDate = a.due_date
      }

      // Check if this agreement has been paid (via ASAAS)
      if (a.payment_status === "received" || a.payment_status === "confirmed" || a.status === "completed") {
        existing.isPaid = true
      }

      // Check if this agreement is active (pending payment)
      if ((a.status === "active" || a.status === "draft") && a.payment_status !== "received" && a.payment_status !== "confirmed") {
        existing.isActive = true
      }

      agreementStatusMap.set(customerId, existing)
    })

    // Get behavioral analyses
    const behavioralRes = await getAllBehavioralAnalyses()
    const allBehavioralAnalyses = behavioralRes.success ? behavioralRes.data : []

    // Create map for quick lookup
    const behavioralMap = new Map()
    if (allBehavioralAnalyses) {
      allBehavioralAnalyses.forEach((analysis: any) => {
        if (analysis.cpf) {
          const cleanCpf = analysis.cpf.replace(/[^\d]/g, "")
          behavioralMap.set(cleanCpf, analysis)
        }
      })
    }

    // Enrich customer data with behavioral analysis and ASAAS-backed negotiation status
    const clientes = (vmaxCustomers || []).map((cliente: any) => {
      const cpfCnpj = cliente["CPF/CNPJ"]?.replace(/[^\d]/g, "")
      const behavioralData = cpfCnpj ? behavioralMap.get(cpfCnpj) : null

      // Get real agreement status from ASAAS data
      // VMAX ID -> Customer ID -> Agreement Status
      const customerId = vmaxToCustomerMap.get(cliente.id)
      const agreementStatus = customerId ? agreementStatusMap.get(customerId) : null

      // Determine negotiation status based on ASAAS data, NOT the legacy approval_status
      // MUST MATCH Acordos page: any non-cancelled agreement = "Enviada"
      let asaasNegotiationStatus = "NENHUMA"
      if (agreementStatus?.isPaid) {
        asaasNegotiationStatus = "PAGO"
      } else if (agreementStatus?.hasActiveAgreement) {
        // Has non-cancelled agreement - this matches Acordos page "activeAgreements"
        if (agreementStatus?.hasAsaasCharge) {
          asaasNegotiationStatus = "ATIVA_ASAAS" // Has ASAAS charge pending payment
        } else {
          asaasNegotiationStatus = "ATIVA" // Has agreement but no ASAAS charge yet
        }
      }
      // If only cancelled agreements exist, status stays "NENHUMA"

      return {
        ...cliente,
        behavioralData,
        asaasNegotiationStatus, // Real ASAAS-backed status
        hasAsaasCharge: agreementStatus?.hasAsaasCharge || false,
        hasActiveAgreement: agreementStatus?.hasActiveAgreement || false, // For stats calculation
        paymentStatus: agreementStatus?.paymentStatus || null, // ASAAS payment status for debt status display
        asaasDueDate: agreementStatus?.dueDate || null, // ASAAS charge due date (replaces VMAX Vecto)
      }
    })

    return <AdminClientesContent clientes={clientes} company={company} />
  } catch (error) {
    console.error("Error loading clients:", error)
    return (
      <div
        className="p-6 rounded-xl"
        style={{ background: "var(--admin-red-bg)", border: "1px solid var(--admin-red)" }}
      >
        <h3 className="font-semibold mb-2" style={{ color: "var(--admin-red)" }}>
          Erro ao carregar clientes
        </h3>
        <p className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
          {error instanceof Error ? error.message : "Erro desconhecido"}
        </p>
      </div>
    )
  }
}
