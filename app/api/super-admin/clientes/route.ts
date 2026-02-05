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
    let clientesQuery = db.select().from(vmax)
    let allClientes
    if (effectiveCompanyId) {
      allClientes = await db
        .select()
        .from(vmax)
        .where(eq(vmax.idCompany, effectiveCompanyId))
    } else {
      allClientes = await db.select().from(vmax)
    }

    // Fetch all companies for mapping
    const allCompanies = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)

    // Create a map for quick company lookup
    const companyMap = new Map(allCompanies.map((c) => [c.id, c.name]))

    // Map clientes with company names
    const clientesWithCompanyNames = allClientes.map((cliente) => ({
      id: cliente.id,
      cliente: cliente.cliente,
      cpfCnpj: cliente.cpfCnpj,
      cidade: cliente.cidade,
      primeiraVencida: cliente.primeiraVencida,
      valorTotal: cliente.valorTotal,
      quantidadeTitulos: cliente.quantidadeTitulos,
      maiorAtraso: cliente.maiorAtraso,
      creditScore: cliente.creditScore,
      riskLevel: cliente.riskLevel,
      approvalStatus: cliente.approvalStatus,
      companyId: cliente.idCompany,
      companyName: cliente.idCompany ? companyMap.get(cliente.idCompany) || null : null,
    }))

    // Return data with user role info for frontend
    return NextResponse.json({
      clientes: clientesWithCompanyNames,
      userRole: userProfile?.role || "user",
      userCompanyId: userCompanyId,
    })
  } catch (error) {
    console.error("[API] Error fetching clientes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
