import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { companies, customers, debts } from "@/lib/db/schema"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    // Verify authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("id")

    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 })
    }

    // Get company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Get customers count and first 5
    let customersData: typeof customers.$inferSelect[] = []
    let customersError: string | undefined

    try {
      customersData = await db
        .select()
        .from(customers)
        .where(eq(customers.companyId, companyId))
    } catch (error) {
      customersError = error instanceof Error ? error.message : "Unknown error"
    }

    // Get debts count and first 5
    let debtsData: typeof debts.$inferSelect[] = []
    let debtsError: string | undefined

    try {
      debtsData = await db
        .select()
        .from(debts)
        .where(eq(debts.companyId, companyId))
    } catch (error) {
      debtsError = error instanceof Error ? error.message : "Unknown error"
    }

    return NextResponse.json({
      company,
      customersCount: customersData.length,
      debtsCount: debtsData.length,
      customers: customersData.slice(0, 5).map((c) => ({
        id: c.id,
        name: c.name,
        document: c.document,
      })),
      debts: debtsData.slice(0, 5).map((d) => ({
        id: d.id,
        amount: d.amount,
        status: d.status,
      })),
      customersError,
      debtsError,
    })
  } catch (error) {
    console.error("[v0] Erro ao verificar empresa:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
