import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { companies } from "@/lib/db/schema"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const allCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        cnpj: companies.cnpj,
        email: companies.email,
        status: companies.status,
      })
      .from(companies)
      .orderBy(companies.name)

    return NextResponse.json(allCompanies)
  } catch (error) {
    console.error("[API] Error fetching companies:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
