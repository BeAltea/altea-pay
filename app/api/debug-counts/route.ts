import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const supabase = createAdminClient()

  // Find VMAX company
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .ilike("name", "%VMAX%")

  const companyId = companies?.[0]?.id
  const companyName = companies?.[0]?.name

  if (!companyId) {
    return NextResponse.json({ error: "VMAX company not found" }, { status: 404 })
  }

  // ---- COUNT VMAX RECORDS ----
  let allVmax: any[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data: vmaxPage } = await supabase
      .from("VMAX")
      .select("id, \"CPF/CNPJ\", negotiation_status")
      .eq("id_company", companyId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!vmaxPage || vmaxPage.length === 0) break
    allVmax = [...allVmax, ...vmaxPage]
    if (vmaxPage.length < pageSize) break
    page++
  }

  // Count VMAX by negotiation_status field
  const vmaxByNegStatus: Record<string, number> = {}
  allVmax.forEach((v) => {
    const s = v.negotiation_status || "null"
    vmaxByNegStatus[s] = (vmaxByNegStatus[s] || 0) + 1
  })

  // ---- COUNT AGREEMENTS ----
  const { data: allAgreements } = await supabase
    .from("agreements")
    .select("id, customer_id, status, payment_status, asaas_payment_id")
    .eq("company_id", companyId)

  // Count agreements by status
  const agreementsByStatus: Record<string, number> = {}
  ;(allAgreements || []).forEach((a) => {
    const s = a.status || "null"
    agreementsByStatus[s] = (agreementsByStatus[s] || 0) + 1
  })

  // Count unique customer_ids in agreements (non-cancelled)
  const nonCancelledAgreements = (allAgreements || []).filter(a => a.status !== "cancelled")
  const uniqueCustomerIds = new Set(nonCancelledAgreements.map(a => a.customer_id))

  // Count agreements with asaas_payment_id
  const withAsaasPaymentId = (allAgreements || []).filter(a => a.asaas_payment_id).length

  // ---- GET CUSTOMER DOCUMENTS TO MAP TO VMAX ----
  const customerIds = Array.from(new Set((allAgreements || []).map(a => a.customer_id).filter(Boolean)))

  const { data: customers } = await supabase
    .from("customers")
    .select("id, document")
    .in("id", customerIds)

  // Build customer_id -> normalized document map
  const customerIdToDoc = new Map<string, string>()
  ;(customers || []).forEach((c) => {
    const normalizedDoc = (c.document || "").replace(/\D/g, "")
    if (normalizedDoc) {
      customerIdToDoc.set(c.id, normalizedDoc)
    }
  })

  // Build set of documents with non-cancelled agreements (this is what Super Admin uses)
  const docsWithNonCancelledAgreements = new Set<string>()
  nonCancelledAgreements.forEach((a) => {
    const doc = customerIdToDoc.get(a.customer_id)
    if (doc) {
      docsWithNonCancelledAgreements.add(doc)
    }
  })

  // Count VMAX customers whose CPF/CNPJ is in the set
  let vmaxWithNonCancelledAgreement = 0
  allVmax.forEach((v) => {
    const cpfCnpj = (v["CPF/CNPJ"] || "").replace(/\D/g, "")
    if (docsWithNonCancelledAgreements.has(cpfCnpj)) {
      vmaxWithNonCancelledAgreement++
    }
  })

  // ---- ANALYSIS ----
  // Find customer_ids that don't map to any document (orphaned)
  const orphanedCustomerIds = customerIds.filter(id => !customerIdToDoc.has(id))

  // Count agreements by status that have document mapping vs not
  const agreementsWithMapping = nonCancelledAgreements.filter(a => customerIdToDoc.has(a.customer_id)).length
  const agreementsWithoutMapping = nonCancelledAgreements.filter(a => !customerIdToDoc.has(a.customer_id)).length

  return NextResponse.json({
    company: { id: companyId, name: companyName },

    vmax: {
      total: allVmax.length,
      byNegotiationStatus: vmaxByNegStatus,
    },

    agreements: {
      total: allAgreements?.length || 0,
      byStatus: agreementsByStatus,
      withAsaasPaymentId,
      uniqueCustomerIds: uniqueCustomerIds.size,
    },

    documentMapping: {
      customersWithDocuments: customerIdToDoc.size,
      orphanedCustomerIds: orphanedCustomerIds.length,
      orphanedCustomerIdsList: orphanedCustomerIds.slice(0, 10), // First 10 for debugging
      docsWithNonCancelledAgreements: docsWithNonCancelledAgreements.size,
    },

    finalCounts: {
      vmaxWithNonCancelledAgreement,
      explanation: "This is the count of VMAX customers whose CPF/CNPJ matches a customer with non-cancelled agreement. This should equal 215.",
    },

    analysis: {
      agreementsWithDocumentMapping: agreementsWithMapping,
      agreementsWithoutDocumentMapping: agreementsWithoutMapping,
    }
  })
}
