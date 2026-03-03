import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

/**
 * GET /api/companies
 *
 * Lists all companies. Used by super-admin pages.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name, document, email, phone, city, state")
      .order("name", { ascending: true })

    if (error) {
      console.error("[Companies API] Error:", error)
      return NextResponse.json(
        { error: "Erro ao buscar empresas" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      companies: companies || [],
    })
  } catch (error: any) {
    console.error("[Companies API] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
