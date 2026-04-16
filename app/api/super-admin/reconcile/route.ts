import { createAdminClient, createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { isPaidStatus, PAID_ASAAS_STATUSES } from "@/lib/constants/payment-status"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes for reconciliation

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_BASE_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"

interface AsaasCustomer {
  id: string
  name: string
  cpfCnpj: string
  email?: string
  mobilePhone?: string
}

interface AsaasPayment {
  id: string
  customer: string
  value: number
  dueDate: string
  status: string
  billingType: string
  paymentDate?: string
  invoiceUrl?: string
}

interface ReconciliationResult {
  company: { id: string; name: string }
  timestamp: string
  alteapay: {
    vmaxCount: number
    agreementsCount: number
    agreementsWithAsaas: number
    paidCount: number
    pendingCount: number
    cancelledCount: number
    totalDebt: number
    recoveredDebt: number
  }
  asaas: {
    customersCount: number
    paymentsCount: number
    paidCount: number
    pendingCount: number
    overdueCount: number
    totalValue: number
    receivedValue: number
  }
  discrepancies: {
    paidCountDiff: number
    valuesDiff: number
    customersWithoutPayments: string[]
    paymentsWithoutAgreements: string[]
    statusMismatches: Array<{
      asaasPaymentId: string
      customerName: string
      asaasStatus: string
      alteapayStatus: string | null
    }>
  }
  summary: {
    isReconciled: boolean
    issues: string[]
  }
}

async function fetchAsaasCustomers(offset = 0, limit = 100): Promise<{ data: AsaasCustomer[]; hasMore: boolean }> {
  const response = await fetch(`${ASAAS_BASE_URL}/customers?offset=${offset}&limit=${limit}`, {
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY || "",
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch ASAAS customers: ${response.status}`)
  }

  const data = await response.json()
  return {
    data: data.data || [],
    hasMore: data.hasMore || false,
  }
}

async function fetchAsaasPaymentsForCustomer(customerId: string): Promise<AsaasPayment[]> {
  const response = await fetch(`${ASAAS_BASE_URL}/payments?customer=${customerId}&limit=100`, {
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY || "",
    },
  })

  if (!response.ok) {
    console.warn(`Failed to fetch payments for customer ${customerId}: ${response.status}`)
    return []
  }

  const data = await response.json()
  return data.data || []
}

export async function GET(request: NextRequest) {
  try {
    // Verify super admin
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
    }

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")

    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch company info
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: "Empresa nao encontrada" }, { status: 404 })
    }

    // ============ ALTEAPAY DATA ============

    // Fetch VMAX records with pagination
    let vmaxRecords: any[] = []
    let page = 0
    const pageSize = 1000

    while (true) {
      const { data: pageData } = await supabase
        .from("VMAX")
        .select("id, \"CPF/CNPJ\", Cliente, Vencido, negotiation_status")
        .eq("id_company", companyId)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (!pageData || pageData.length === 0) break
      vmaxRecords = [...vmaxRecords, ...pageData]
      if (pageData.length < pageSize) break
      page++
    }

    // Fetch agreements with pagination
    let allAgreements: any[] = []
    page = 0

    while (true) {
      const { data: pageData } = await supabase
        .from("agreements")
        .select("id, customer_id, status, payment_status, asaas_status, asaas_payment_id, asaas_customer_id, agreed_amount")
        .eq("company_id", companyId)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (!pageData || pageData.length === 0) break
      allAgreements = [...allAgreements, ...pageData]
      if (pageData.length < pageSize) break
      page++
    }

    // Fetch customers to map customer_id -> document
    const customerIds = Array.from(new Set(allAgreements.map(a => a.customer_id).filter(Boolean)))
    const customerDocMap = new Map<string, string>()

    if (customerIds.length > 0) {
      for (let i = 0; i < customerIds.length; i += 500) {
        const batch = customerIds.slice(i, i + 500)
        const { data: customers } = await supabase
          .from("customers")
          .select("id, document, name")
          .in("id", batch)

        if (customers) {
          customers.forEach((c: any) => {
            if (c.document) {
              customerDocMap.set(c.id, c.document.replace(/\D/g, ""))
            }
          })
        }
      }
    }

    // Calculate AlteaPay metrics
    const activeAgreements = allAgreements.filter(a => a.status !== "cancelled")
    const agreementsWithAsaas = activeAgreements.filter(a => a.asaas_payment_id)
    const paidAgreements = activeAgreements.filter(a => isPaidStatus(a.status, a.payment_status, a.asaas_status))
    const pendingAgreements = activeAgreements.filter(a => !isPaidStatus(a.status, a.payment_status, a.asaas_status))
    const cancelledAgreements = allAgreements.filter(a => a.status === "cancelled")

    // Calculate total debt from VMAX
    let totalDebt = 0
    vmaxRecords.forEach((v: any) => {
      const vencidoStr = String(v.Vencido || "0")
      const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
      totalDebt += Number(cleanValue) || 0
    })

    // Calculate recovered debt from paid agreements
    const recoveredDebt = paidAgreements.reduce((sum, a) => sum + (Number(a.agreed_amount) || 0), 0)

    // ============ ASAAS DATA ============

    // Get unique ASAAS customer IDs from agreements
    const asaasCustomerIds = Array.from(new Set(agreementsWithAsaas.map(a => a.asaas_customer_id).filter(Boolean)))

    let asaasPayments: AsaasPayment[] = []
    const customersWithoutPayments: string[] = []
    const BATCH_DELAY_MS = 200 // Rate limiting

    // Fetch payments for each ASAAS customer
    for (let i = 0; i < asaasCustomerIds.length; i++) {
      const customerId = asaasCustomerIds[i]
      const payments = await fetchAsaasPaymentsForCustomer(customerId)

      if (payments.length === 0) {
        // Find customer name from agreement
        const agreement = agreementsWithAsaas.find(a => a.asaas_customer_id === customerId)
        if (agreement) {
          customersWithoutPayments.push(customerId)
        }
      }

      asaasPayments = [...asaasPayments, ...payments]

      // Rate limiting
      if (i < asaasCustomerIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    // Calculate ASAAS metrics
    const asaasPaidPayments = asaasPayments.filter(p =>
      PAID_ASAAS_STATUSES.includes(p.status as any)
    )
    const asaasPendingPayments = asaasPayments.filter(p => p.status === "PENDING")
    const asaasOverduePayments = asaasPayments.filter(p => p.status === "OVERDUE")

    const totalAsaasValue = asaasPayments.reduce((sum, p) => sum + (p.value || 0), 0)
    const receivedAsaasValue = asaasPaidPayments.reduce((sum, p) => sum + (p.value || 0), 0)

    // ============ DISCREPANCY DETECTION ============

    // Build map of ASAAS payment ID -> AlteaPay agreement
    const asaasIdToAgreement = new Map<string, any>()
    agreementsWithAsaas.forEach(a => {
      if (a.asaas_payment_id) {
        asaasIdToAgreement.set(a.asaas_payment_id, a)
      }
    })

    // Find payments without matching agreements
    const paymentsWithoutAgreements: string[] = []
    const statusMismatches: Array<{
      asaasPaymentId: string
      customerName: string
      asaasStatus: string
      alteapayStatus: string | null
    }> = []

    for (const payment of asaasPayments) {
      const agreement = asaasIdToAgreement.get(payment.id)

      if (!agreement) {
        paymentsWithoutAgreements.push(payment.id)
        continue
      }

      // Check for status mismatch
      const asaasPaid = PAID_ASAAS_STATUSES.includes(payment.status as any)
      const alteapayPaid = isPaidStatus(agreement.status, agreement.payment_status, agreement.asaas_status)

      if (asaasPaid !== alteapayPaid) {
        statusMismatches.push({
          asaasPaymentId: payment.id,
          customerName: payment.customer,
          asaasStatus: payment.status,
          alteapayStatus: agreement.payment_status || agreement.status,
        })
      }
    }

    // Calculate discrepancies
    const paidCountDiff = asaasPaidPayments.length - paidAgreements.length
    const valuesDiff = Math.abs(receivedAsaasValue - recoveredDebt)

    // Generate summary
    const issues: string[] = []

    if (paidCountDiff !== 0) {
      issues.push(`Paid count mismatch: ASAAS has ${asaasPaidPayments.length}, AlteaPay has ${paidAgreements.length} (diff: ${paidCountDiff})`)
    }

    if (valuesDiff > 1) { // Allow 1 BRL tolerance for rounding
      issues.push(`Recovered value mismatch: ASAAS has R$ ${receivedAsaasValue.toFixed(2)}, AlteaPay has R$ ${recoveredDebt.toFixed(2)} (diff: R$ ${valuesDiff.toFixed(2)})`)
    }

    if (statusMismatches.length > 0) {
      issues.push(`${statusMismatches.length} payment(s) have status mismatch between ASAAS and AlteaPay`)
    }

    if (paymentsWithoutAgreements.length > 0) {
      issues.push(`${paymentsWithoutAgreements.length} ASAAS payment(s) don't have matching AlteaPay agreements`)
    }

    if (customersWithoutPayments.length > 0) {
      issues.push(`${customersWithoutPayments.length} ASAAS customer(s) have no payments`)
    }

    const result: ReconciliationResult = {
      company: { id: company.id, name: company.name },
      timestamp: new Date().toISOString(),
      alteapay: {
        vmaxCount: vmaxRecords.length,
        agreementsCount: allAgreements.length,
        agreementsWithAsaas: agreementsWithAsaas.length,
        paidCount: paidAgreements.length,
        pendingCount: pendingAgreements.length,
        cancelledCount: cancelledAgreements.length,
        totalDebt,
        recoveredDebt,
      },
      asaas: {
        customersCount: asaasCustomerIds.length,
        paymentsCount: asaasPayments.length,
        paidCount: asaasPaidPayments.length,
        pendingCount: asaasPendingPayments.length,
        overdueCount: asaasOverduePayments.length,
        totalValue: totalAsaasValue,
        receivedValue: receivedAsaasValue,
      },
      discrepancies: {
        paidCountDiff,
        valuesDiff,
        customersWithoutPayments: customersWithoutPayments.slice(0, 10), // Limit to 10
        paymentsWithoutAgreements: paymentsWithoutAgreements.slice(0, 10),
        statusMismatches: statusMismatches.slice(0, 20), // Limit to 20
      },
      summary: {
        isReconciled: issues.length === 0,
        issues,
      },
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[RECONCILE] Error:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
  }
}
