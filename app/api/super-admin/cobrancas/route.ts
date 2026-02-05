import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { vmax, companies, profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to check role and companyId
    const [userProfile] = await db
      .select({ role: profiles.role, companyId: profiles.companyId })
      .from(profiles)
      .where(eq(profiles.id, session.user.id!))
      .limit(1)

    const isSuperAdmin = userProfile?.role === "super_admin"
    const userCompanyId = userProfile?.companyId

    // Get companyId filter from query params (only used for super_admin)
    const { searchParams } = new URL(request.url)
    const filterCompanyId = searchParams.get("companyId")

    // Determine which companyId to filter by
    let effectiveCompanyId: string | null = null
    if (isSuperAdmin) {
      // Super admin can filter by any company or see all
      effectiveCompanyId = filterCompanyId || null
    } else {
      // Non-super admin users can only see their own company's data
      effectiveCompanyId = userCompanyId || null
      if (!effectiveCompanyId) {
        return NextResponse.json({ error: "No company assigned to user" }, { status: 403 })
      }
    }

    // Fetch VMAX records with optional company filter
    let allCobrancas
    if (effectiveCompanyId) {
      allCobrancas = await db
        .select()
        .from(vmax)
        .where(eq(vmax.idCompany, effectiveCompanyId))
    } else {
      allCobrancas = await db.select().from(vmax)
    }

    // Fetch all companies for mapping
    const allCompanies = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)

    // Create a map for quick company lookup
    const companyMap = new Map(allCompanies.map((c) => [c.id, c.name]))

    // Map cobrancas with company names
    const cobrancasWithCompanyNames = allCobrancas.map((cobranca) => ({
      id: cobranca.id,
      cliente: cobranca.cliente,
      cpfCnpj: cobranca.cpfCnpj,
      primeiraVencida: cobranca.primeiraVencida,
      valorTotal: cobranca.valorTotal,
      quantidadeTitulos: cobranca.quantidadeTitulos,
      maiorAtraso: cobranca.maiorAtraso,
      autoCollectionEnabled: cobranca.autoCollectionEnabled,
      collectionProcessedAt: cobranca.collectionProcessedAt?.toISOString() || null,
      lastCollectionAttempt: cobranca.lastCollectionAttempt?.toISOString() || null,
      companyId: cobranca.idCompany,
      companyName: cobranca.idCompany ? companyMap.get(cobranca.idCompany) || null : null,
    }))

    // Return data with user role info for frontend
    return NextResponse.json({
      cobrancas: cobrancasWithCompanyNames,
      userRole: userProfile?.role || "user",
      userCompanyId: userCompanyId,
    })
  } catch (error) {
    console.error("[API] Error fetching cobrancas:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
