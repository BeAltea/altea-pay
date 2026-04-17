"use server"

import { createClient } from "@supabase/supabase-js"
import { PAID_ASAAS_STATUSES, PAID_PAYMENT_STATUSES, PAID_AGREEMENT_STATUSES } from "@/lib/constants/payment-status"

// Types
interface ReportAgreement {
  id: string
  customer_id: string
  company_id: string
  debt_id: string | null
  agreed_amount: number | null
  asaas_status: string | null
  payment_status: string | null
  payment_received_at: string | null
  due_date: string | null
  updated_at: string | null
  created_at: string | null
  customers: {
    id: string
    name: string | null
    document: string | null
  } | null
  debts: {
    id: string
    due_date: string | null
    amount: number | null
  } | null
}

interface SetupRule {
  id: string
  operator: string
  min_days: number
  max_days: number | null
  profit_percentage: number
  sort_order: number
}

export interface ContabilidadeReportRow {
  clientName: string
  cpfCnpj: string
  debtAmount: number
  paidAmount: number
  paymentDate: string
  dueDate: string
  daysExpired: number
  ruleLabel: string
  profitPercentage: number
  alteapayProfit: number
  clientTransfer: number
}

/**
 * Generate contabilidade report using admin client to bypass RLS
 * This is necessary because super-admin needs to query other companies' data
 */
export async function generateContabilidadeReport(
  companyId: string,
  startDate: Date,
  endDate: Date,
  rules: SetupRule[]
): Promise<{ data: ContabilidadeReportRow[]; error: string | null }> {
  try {
    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch paid agreements with related customer and debt data
    // Use .range(0, 99999) to bypass the 1000-row default limit
    const paidStatusFilter = `asaas_status.in.(${PAID_ASAAS_STATUSES.join(",")}),payment_status.in.(${PAID_PAYMENT_STATUSES.join(",")}),status.in.(${PAID_AGREEMENT_STATUSES.join(",")})`

    const { data: agreementsData, error: agreementsError } = await supabaseAdmin
      .from("agreements")
      .select(`
        id,
        customer_id,
        company_id,
        debt_id,
        agreed_amount,
        asaas_status,
        payment_status,
        payment_received_at,
        due_date,
        updated_at,
        created_at,
        customers (
          id,
          name,
          document
        ),
        debts (
          id,
          due_date,
          amount
        )
      `)
      .eq("company_id", companyId)
      .or(paidStatusFilter)
      .range(0, 99999)

    if (agreementsError) {
      console.error("[Contabilidade] Query error:", agreementsError)
      return { data: [], error: agreementsError.message }
    }

    // Filter by payment date (payment_received_at with updated_at fallback)
    const startTime = startDate.getTime()
    const endTime = endDate.getTime()

    const paidAgreementsInPeriod = (agreementsData || []).filter((a: any) => {
      const paymentDateStr = a.payment_received_at || a.updated_at
      if (!paymentDateStr) return false
      const paymentDate = new Date(paymentDateStr)
      return paymentDate.getTime() >= startTime && paymentDate.getTime() <= endTime
    }) as ReportAgreement[]

    console.log(`[Contabilidade] Found ${paidAgreementsInPeriod.length} paid agreements in period for company ${companyId}`)

    // Also fetch agreements where payment_received_at is NULL but status is pago_ao_cliente
    // These might use updated_at as the payment date
    const { data: directPaidData } = await supabaseAdmin
      .from("agreements")
      .select(`
        id,
        customer_id,
        company_id,
        debt_id,
        agreed_amount,
        asaas_status,
        payment_status,
        payment_received_at,
        due_date,
        updated_at,
        created_at,
        customers (
          id,
          name,
          document
        ),
        debts (
          id,
          due_date,
          amount
        )
      `)
      .eq("company_id", companyId)
      .eq("payment_status", "pago_ao_cliente")
      .is("payment_received_at", null)
      .gte("updated_at", startDate.toISOString())
      .lte("updated_at", endDate.toISOString())
      .range(0, 99999)

    // Combine and deduplicate by id
    const existingIds = new Set(paidAgreementsInPeriod.map(a => a.id))
    const allAgreements = [...paidAgreementsInPeriod]
    for (const a of (directPaidData || []) as ReportAgreement[]) {
      if (!existingIds.has(a.id)) {
        allAgreements.push(a)
      }
    }

    console.log(`[Contabilidade] Total agreements after dedup: ${allAgreements.length}`)

    // Sort rules by sort_order for proper matching
    const sortedRules = [...rules].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    // Process data into report rows
    const rows: ContabilidadeReportRow[] = []

    for (const agreement of allAgreements) {
      // Payment date: prefer payment_received_at, fallback to updated_at
      const paymentDateStr = agreement.payment_received_at || agreement.updated_at || agreement.created_at
      if (!paymentDateStr) continue

      const paymentDate = new Date(paymentDateStr)

      // Original debt due date: from debts table, fallback to agreement.due_date
      const originalDueDate = agreement.debts?.due_date || agreement.due_date

      // Calculate days overdue (at time of payment)
      let daysExpired = 0
      if (originalDueDate) {
        const dueDate = new Date(originalDueDate)
        const diffMs = paymentDate.getTime() - dueDate.getTime()
        daysExpired = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      }

      // Find matching rule based on operator (first match wins)
      let matchingRule: SetupRule | null = null
      for (const rule of sortedRules) {
        let matches = false
        switch (rule.operator) {
          case "=":
            matches = daysExpired === rule.min_days
            break
          case "<=":
            matches = daysExpired <= rule.min_days
            break
          case ">=":
            matches = daysExpired >= rule.min_days
            break
          case "entre":
          default:
            if (rule.max_days === null) {
              matches = daysExpired >= rule.min_days
            } else {
              matches = daysExpired >= rule.min_days && daysExpired <= rule.max_days
            }
            break
        }
        if (matches) {
          matchingRule = rule
          break
        }
      }

      // Skip if no matching rule
      if (!matchingRule) {
        console.log(`[Contabilidade] No matching rule for ${daysExpired} days overdue`)
        continue
      }

      // Calculate amounts
      const paidAmount = Number(agreement.agreed_amount) || 0
      const alteapayProfit = paidAmount * (matchingRule.profit_percentage / 100)
      const clientTransfer = paidAmount - alteapayProfit

      // Client info from customers join
      const clientName = agreement.customers?.name || "N/A"
      const cpfCnpj = agreement.customers?.document || "N/A"

      // Debt amount from debts join
      const debtAmount = Number(agreement.debts?.amount) || paidAmount

      // Format rule label
      let ruleLabel = "Sem faixa"
      if (matchingRule.operator === "<=") {
        ruleLabel = `<= ${matchingRule.min_days} dias`
      } else if (matchingRule.operator === ">=") {
        ruleLabel = `>= ${matchingRule.min_days} dias`
      } else if (matchingRule.operator === "entre") {
        ruleLabel = `${matchingRule.min_days}-${matchingRule.max_days} dias`
      } else if (matchingRule.operator === "=") {
        ruleLabel = `= ${matchingRule.min_days} dias`
      }

      rows.push({
        clientName,
        cpfCnpj: formatCpfCnpj(cpfCnpj),
        debtAmount,
        paidAmount,
        paymentDate: formatDate(paymentDate),
        dueDate: originalDueDate ? formatDate(new Date(originalDueDate)) : "N/A",
        daysExpired,
        ruleLabel,
        profitPercentage: matchingRule.profit_percentage,
        alteapayProfit,
        clientTransfer,
      })
    }

    console.log(`[Contabilidade] Generated ${rows.length} report rows`)

    return { data: rows, error: null }
  } catch (error) {
    console.error("[Contabilidade] Error generating report:", error)
    return { data: [], error: String(error) }
  }
}

// Helper functions
function formatCpfCnpj(doc: string): string {
  const cleaned = doc.replace(/\D/g, "")
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  } else if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  }
  return doc
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}
