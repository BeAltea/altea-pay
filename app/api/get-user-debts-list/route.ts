import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"
import { vmax } from "@/lib/db/schema"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, cpfCnpj } = await request.json()

    if (!userId || !cpfCnpj) {
      return NextResponse.json({ error: "Missing userId or cpfCnpj" }, { status: 400 })
    }

    console.log("[v0] API get-user-debts-list: userId:", userId, "CPF:", cpfCnpj)

    // Clean CPF/CNPJ
    const cleanCpfCnpj = cpfCnpj.replace(/[^\d]/g, "")

    const allDebts: any[] = []

    // Search in VMAX table
    try {
      console.log("[v0] Searching in table: VMAX")

      // Query VMAX table filtering by CPF/CNPJ
      const vmaxRecords = await db
        .select()
        .from(vmax)
        .where(
          sql`REPLACE(REPLACE(REPLACE("CPF/CNPJ", '.', ''), '-', ''), '/', '') = ${cleanCpfCnpj}
          OR "CPF/CNPJ" = ${cpfCnpj}`
        )

      console.log(`[v0] Table VMAX: ${vmaxRecords.length} matching records`)

      for (const record of vmaxRecords) {
        // Convert to standard debt format
        const debt: any = {
          id: record.id || `VMAX-${Math.random()}`,
          company_name: "VMAX",
          customer_name: record.cliente || "Cliente",
          amount:
            Number.parseFloat(
              String(record.valorTotal || "0")
                .replace(/R\$/g, "")
                .replace(/\s/g, "")
                .replace(/\./g, "")
                .replace(",", ".")
            ) || 0,
          due_date: record.primeiraVencida || null,
          days_overdue:
            Number.parseInt(String(record.maiorAtraso || "0").replace(/\D/g, "")) || 0,
          status: "overdue",
          cpf_cnpj: record.cpfCnpj || cpfCnpj,
          city: record.cidade || null,
          propensity_payment_score: 0,
          propensity_loan_score: 0,
        }

        allDebts.push(debt)
      }
    } catch (tableError) {
      console.error("[v0] Error searching table VMAX:", tableError)
    }

    console.log(`[v0] Total debts found: ${allDebts.length}`)

    return NextResponse.json({ debts: allDebts })
  } catch (error) {
    console.error("[v0] API get-user-debts-list error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
