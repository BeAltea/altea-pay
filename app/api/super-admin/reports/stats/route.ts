import { createAdminClient, createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
}

interface Company {
  id: string
  name: string
}

interface VmaxRecord {
  id: string
  id_company: string
  Vencido: string
  "CPF/CNPJ": string
  "Dias Inad.": string | number
  negotiation_status?: string
  Cliente?: string
}

interface Agreement {
  id: string
  customer_id: string
  company_id: string
  status: string
  asaas_status?: string
  agreed_amount?: number
  created_at: string
}

// Parse VMAX currency value
function parseVencido(value: string): number {
  const vencidoStr = String(value || "0")
  const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  return Number(cleanValue) || 0
}

export async function GET(request: NextRequest) {
  try {
    // Verify the user is a super admin
    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401, headers: noCacheHeaders })
    }

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403, headers: noCacheHeaders })
    }

    const supabase = createAdminClient()

    // Fetch companies
    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, name")
      .order("name")

    const companies: Company[] = companiesData || []

    // Fetch VMAX data with pagination
    let allVmax: VmaxRecord[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: vmaxPage } = await supabase
        .from("VMAX")
        .select('id, id_company, Vencido, "CPF/CNPJ", "Dias Inad.", negotiation_status, Cliente')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (vmaxPage && vmaxPage.length > 0) {
        allVmax = [...allVmax, ...vmaxPage]
        page++
        hasMore = vmaxPage.length === pageSize
      } else {
        hasMore = false
      }
    }

    // Fetch agreements with pagination
    let allAgreements: Agreement[] = []
    page = 0
    hasMore = true

    while (hasMore) {
      const { data: agreementsPage } = await supabase
        .from("agreements")
        .select("id, customer_id, company_id, status, asaas_status, agreed_amount, created_at")
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (agreementsPage && agreementsPage.length > 0) {
        allAgreements = [...allAgreements, ...agreementsPage]
        page++
        hasMore = agreementsPage.length === pageSize
      } else {
        hasMore = false
      }
    }

    // Fetch customers for document mapping
    const { data: customers } = await supabase
      .from("customers")
      .select("id, document, company_id")

    // Build customerIdToDoc map
    const customerIdToDoc = new Map<string, string>()
    for (const c of customers || []) {
      if (c.document) {
        customerIdToDoc.set(c.id, c.document.replace(/\D/g, ""))
      }
    }

    // Build paidDocsMap - ONLY status === "completed" counts as paid
    const paidDocsByCompany = new Map<string, Set<string>>()
    for (const a of allAgreements) {
      if (a.status === "completed") {
        const doc = customerIdToDoc.get(a.customer_id)
        if (doc && a.company_id) {
          if (!paidDocsByCompany.has(a.company_id)) {
            paidDocsByCompany.set(a.company_id, new Set())
          }
          paidDocsByCompany.get(a.company_id)!.add(doc)
        }
      }
    }

    // Calculate metrics for each company
    const companyStats = companies.map((company) => {
      const companyVmax = allVmax.filter((v) => v.id_company === company.id)
      const companyAgreements = allAgreements.filter((a) => a.company_id === company.id)
      const companyPaidDocs = paidDocsByCompany.get(company.id) || new Set<string>()

      const uniqueClients = new Set(companyVmax.map((v) => v["CPF/CNPJ"]?.replace(/\D/g, "")))

      let debt = 0
      let received = 0
      companyVmax.forEach((v) => {
        const amount = parseVencido(v.Vencido)
        const doc = (v["CPF/CNPJ"] || "").replace(/\D/g, "")
        const isPaid = companyPaidDocs.has(doc) || v.negotiation_status === "PAGO"
        if (isPaid) {
          received += amount
        } else {
          debt += amount
        }
      })

      const total = debt + received
      const rate = total > 0 ? (received / total) * 100 : 0

      // Count UNIQUE CUSTOMERS with non-cancelled/non-draft agreements (not agreement records)
      // This matches the Super Admin Negociações page logic that shows 215
      const sentCustomerIds = new Set(
        companyAgreements
          .filter((a) => a.status !== "cancelled" && a.status !== "draft")
          .map((a) => a.customer_id)
      )
      const paidCustomerIds = new Set(
        companyAgreements
          .filter((a) => a.status === "completed")
          .map((a) => a.customer_id)
      )
      const negSent = sentCustomerIds.size
      const negPaid = paidCustomerIds.size

      return {
        id: company.id,
        name: company.name,
        clients: uniqueClients.size,
        totalDebt: debt,
        received,
        recoveryRate: rate,
        negSent,
        negPaid,
      }
    })

    // Calculate global metrics
    let globalDebt = 0
    let globalReceived = 0
    const globalClients = new Set<string>()

    allVmax.forEach((v) => {
      const amount = parseVencido(v.Vencido)
      const doc = (v["CPF/CNPJ"] || "").replace(/\D/g, "")
      globalClients.add(doc)

      const companyPaidDocs = paidDocsByCompany.get(v.id_company) || new Set<string>()
      const isPaid = companyPaidDocs.has(doc) || v.negotiation_status === "PAGO"

      if (isPaid) {
        globalReceived += amount
      } else {
        globalDebt += amount
      }
    })

    const globalTotal = globalDebt + globalReceived
    const globalRecoveryRate = globalTotal > 0 ? (globalReceived / globalTotal) * 100 : 0

    // Count UNIQUE CUSTOMERS globally (not agreement records)
    // This ensures consistency with the Super Admin Negociações page showing 215
    const globalSentCustomerIds = new Set(
      allAgreements
        .filter((a) => a.status !== "cancelled" && a.status !== "draft")
        .map((a) => a.customer_id)
    )
    const globalPaidCustomerIds = new Set(
      allAgreements
        .filter((a) => a.status === "completed")
        .map((a) => a.customer_id)
    )
    const globalOpenCustomerIds = new Set(
      allAgreements
        .filter((a) => a.status === "active" || a.status === "pending")
        .map((a) => a.customer_id)
    )
    const globalNegSent = globalSentCustomerIds.size
    const globalNegPaid = globalPaidCustomerIds.size
    const globalNegOpen = globalOpenCustomerIds.size
    const globalNegPaidRate = globalNegSent > 0 ? (globalNegPaid / globalNegSent) * 100 : 0

    // Generate monthly chart data
    // Range: 1 month before current + current month + future months = 24 total
    // For 12 months view, the frontend will slice the first 12
    const monthlyData = []
    const now = new Date()

    // Total original debt (before any payments)
    const totalOriginalDebt = globalDebt + globalReceived

    // Start from 1 month ago, go to 22 months in the future (24 total)
    for (let i = -1; i <= 22; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "")

      const isPastOrCurrent = i <= 0

      // For past/current months: show actual received amount
      // For future months: show 0 (no payments yet)
      const monthReceived = isPastOrCurrent
        ? allAgreements
            .filter((a) => {
              if (a.status !== "completed") return false
              const aDate = new Date(a.created_at)
              return (
                aDate.getFullYear() === date.getFullYear() &&
                aDate.getMonth() === date.getMonth()
              )
            })
            .reduce((sum, a) => sum + (a.agreed_amount || 0), 0)
        : 0

      // For debt: show the total outstanding debt (current level)
      // This represents the total debt that needs to be recovered
      // We show the current outstanding amount for all months as a baseline
      monthlyData.push({
        month: monthKey,
        label,
        received: monthReceived,
        debt: globalDebt, // Current outstanding debt (R$ 838.4K)
      })
    }

    return NextResponse.json({
      companies,
      companyStats,
      globalMetrics: {
        empresasAtivas: companies.length,
        totalClientes: globalClients.size,
        dividaTotal: globalDebt,
        totalRecebido: globalReceived,
        recuperacao: globalRecoveryRate,
        negEnviadas: globalNegSent,
        negAbertas: globalNegOpen,
        negPagasRate: globalNegPaidRate,
      },
      monthlyData,
    }, { headers: noCacheHeaders })
  } catch (error: any) {
    console.error("[Reports API] Error:", error)
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500, headers: noCacheHeaders }
    )
  }
}
