import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { eq, sql } from "drizzle-orm"
import { profiles, companies, vmax } from "@/lib/db/schema"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    console.log("[v0] API get-user-debts - Starting...")

    const session = await auth()
    if (!session?.user) {
      console.log("[v0] User not authenticated")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = session.user
    console.log("[v0] User ID:", user.id)

    // Get user profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)

    console.log("[v0] Profile data:", profile)

    if (!profile) {
      console.log("[v0] No profile found")
      return NextResponse.json({ debts: [] })
    }

    // Check if profile has CPF/CNPJ
    if (!profile.cpfCnpj) {
      console.log("[v0] User has no CPF/CNPJ in profile, returning empty")
      return NextResponse.json({ debts: [] })
    }

    console.log("[v0] User CPF/CNPJ:", profile.cpfCnpj)

    const cleanCpfCnpj = profile.cpfCnpj.replace(/\D/g, "")
    const formattedCpfCnpj = profile.cpfCnpj

    const allDebts: any[] = []

    // Search in VMAX table (the main table we have schema for)
    try {
      console.log("[v0] Searching in table: VMAX")

      // Query VMAX table filtering by CPF/CNPJ
      const vmaxRecords = await db
        .select()
        .from(vmax)
        .where(
          sql`REPLACE(REPLACE(REPLACE("CPF/CNPJ", '.', ''), '-', ''), '/', '') = ${cleanCpfCnpj}
          OR "CPF/CNPJ" = ${formattedCpfCnpj}`
        )

      console.log(`[v0] Table VMAX: ${vmaxRecords.length} matching records`)

      if (vmaxRecords.length > 0) {
        // Get company info for VMAX
        let companyId = profile.companyId
        let companyName = "VMAX"

        const [vmaxCompany] = await db
          .select()
          .from(companies)
          .where(eq(companies.name, "VMAX"))
          .limit(1)

        if (vmaxCompany) {
          companyId = vmaxCompany.id
          companyName = vmaxCompany.name
        }

        // Convert to standard debt format
        const formattedDebts = vmaxRecords.map((debt) => {
          // Parse amount
          let amount = 0
          if (debt.valorTotal) {
            const valorStr = String(debt.valorTotal)
            const cleanValue = valorStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
            amount = Number.parseFloat(cleanValue) || 0
          }

          // Parse days overdue
          let daysOverdue = 0
          if (debt.maiorAtraso) {
            daysOverdue = Number.parseInt(String(debt.maiorAtraso).replace(/\D/g, "")) || 0
          }

          // Due date
          const dueDate = debt.primeiraVencida || new Date().toISOString()

          return {
            id: debt.id,
            user_id: user.id,
            customer_id: null,
            amount: amount,
            due_date: dueDate,
            status: daysOverdue > 0 ? "overdue" : "open",
            description: `Fatura - ${debt.cliente || "Sem descricao"}`,
            created_at: debt.createdAt?.toISOString() || new Date().toISOString(),
            updated_at: debt.updatedAt?.toISOString() || new Date().toISOString(),
            propensity_payment_score: 0,
            propensity_loan_score: 0,
            classification: daysOverdue > 90 ? "high_risk" : daysOverdue > 30 ? "medium_risk" : "low_risk",
            source_system: "VMAX",
            external_id: debt.id,
            company_id: companyId,
            company_name: companyName,
            days_overdue: daysOverdue,
          }
        })

        allDebts.push(...formattedDebts)
      }
    } catch (error) {
      console.error("[v0] Error searching VMAX:", error)
    }

    console.log(`[v0] Total debts found: ${allDebts.length}`)

    return NextResponse.json({ debts: allDebts })
  } catch (error: any) {
    console.error("[v0] Error in get-user-debts API:", error)
    return NextResponse.json({ error: "Internal server error", details: error?.message }, { status: 500 })
  }
}
