import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("id")

    if (!companyId) {
      return NextResponse.json({ error: "Company ID required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Buscar empresa
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single()

    if (companyError) {
      return NextResponse.json({ error: companyError.message }, { status: 500 })
    }

    // Buscar clientes
    const { data: customers, error: customersError } = await supabase
      .from("customers")
      .select("id, name, document")
      .eq("company_id", companyId)

    // Buscar dívidas
    const { data: debts, error: debtsError } = await supabase
      .from("debts")
      .select("id, amount, status")
      .eq("company_id", companyId)

    return NextResponse.json({
      company,
      customersCount: customers?.length || 0,
      debtsCount: debts?.length || 0,
      customers: customers?.slice(0, 5), // Primeiros 5 clientes
      debts: debts?.slice(0, 5), // Primeiras 5 dívidas
      customersError: customersError?.message,
      debtsError: debtsError?.message,
    })
  } catch (error) {
    console.error("[v0] Erro ao verificar empresa:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
