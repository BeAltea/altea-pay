import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/companies
 *
 * Lists all companies. Used by super-admin pages.
 * Uses the same createAdminClient as /super-admin/companies page.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    console.log("[Companies API] Fetching companies...")

    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name")
      .order("name", { ascending: true })

    if (error) {
      console.error("[Companies API] Supabase error:", error)
      return NextResponse.json(
        { error: "Erro ao buscar empresas", details: error.message },
        { status: 500 }
      )
    }

    console.log("[Companies API] Found", companies?.length || 0, "companies")

    return NextResponse.json({
      companies: companies || [],
    })
  } catch (error: any) {
    console.error("[Companies API] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error.message },
      { status: 500 }
    )
  }
}
