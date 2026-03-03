import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

/**
 * GET /api/super-admin/localize/clients
 *
 * Lists clients from VMAX table for a specific company with filters.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get("company_id")
    const filter = searchParams.get("filter") || "all"
    const page = parseInt(searchParams.get("page") || "1")
    const perPage = parseInt(searchParams.get("per_page") || "50")
    const search = searchParams.get("search") || ""

    if (!companyId) {
      return NextResponse.json(
        { error: "company_id é obrigatório" },
        { status: 400 }
      )
    }

    // Calculate offset
    const offset = (page - 1) * perPage

    // Build base query - selecting from VMAX table
    // VMAX has 3 phone columns: "Telefone", "Telefone 1", "Telefone 2"
    let query = supabase
      .from("VMAX")
      .select(
        `id, Cliente, "CPF/CNPJ", Email, Telefone, "Telefone 1", "Telefone 2", id_company, created_at, updated_at`,
        { count: "exact" }
      )
      .eq("id_company", companyId)

    // Apply filters - check ALL phone columns
    if (filter === "no_email") {
      query = query.or("Email.is.null,Email.eq.")
    } else if (filter === "no_phone") {
      // No phone = ALL phone fields are null/empty
      // Using RPC or raw filter since we need AND between multiple ORs
      query = query
        .or('Telefone.is.null,Telefone.eq.')
        .or('"Telefone 1".is.null,"Telefone 1".eq.')
        .or('"Telefone 2".is.null,"Telefone 2".eq.')
    } else if (filter === "incomplete") {
      // Either no email OR no phone (all phone fields empty)
      query = query.or('Email.is.null,Email.eq.,Telefone.is.null,Telefone.eq.')
    }

    // Apply search
    if (search) {
      query = query.or(`Cliente.ilike.%${search}%,"CPF/CNPJ".ilike.%${search}%`)
    }

    // Apply pagination
    query = query
      .order("Cliente", { ascending: true })
      .range(offset, offset + perPage - 1)

    const { data: clients, error, count } = await query

    if (error) {
      console.error("[Localize API] Error fetching clients:", error)
      return NextResponse.json(
        { error: "Erro ao buscar clientes", details: error.message },
        { status: 500 }
      )
    }

    // Get summary stats using count queries with head: true to avoid 1000 limit
    // Total count
    const { count: totalCount } = await supabase
      .from("VMAX")
      .select("*", { count: "exact", head: true })
      .eq("id_company", companyId)

    // With email count
    const { count: withEmailCount } = await supabase
      .from("VMAX")
      .select("*", { count: "exact", head: true })
      .eq("id_company", companyId)
      .not("Email", "is", null)
      .neq("Email", "")

    // With phone count - has ANY phone field filled
    // We need to count where at least one phone field is not null/empty
    // Fetch minimal data to calculate (still limited but better approach)
    const { data: phoneCheckData } = await supabase
      .from("VMAX")
      .select(`Telefone, "Telefone 1", "Telefone 2"`)
      .eq("id_company", companyId)
      .limit(10000) // Higher limit for phone check

    const phoneStats = phoneCheckData || []
    const withPhoneCount = phoneStats.filter((c) => {
      const tel = c.Telefone && c.Telefone.trim() !== ""
      const tel1 = c["Telefone 1"] && c["Telefone 1"].trim() !== ""
      const tel2 = c["Telefone 2"] && c["Telefone 2"].trim() !== ""
      return tel || tel1 || tel2
    }).length

    const total = totalCount || phoneStats.length
    const withEmail = withEmailCount || 0
    const withPhone = withPhoneCount

    // Get last assertiva query dates for these clients
    const clientIds = (clients || []).map((c) => c.id)
    const { data: logData } = await supabase
      .from("assertiva_localize_logs")
      .select("client_id, created_at")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false })

    // Create a map of client_id to last query date
    const lastQueryMap = new Map<string, string>()
    for (const log of logData || []) {
      if (!lastQueryMap.has(log.client_id)) {
        lastQueryMap.set(log.client_id, log.created_at)
      }
    }

    // Format response - check ALL phone columns
    const formattedClients = (clients || []).map((client) => {
      const cpfCnpj = client["CPF/CNPJ"] || ""
      const cleanDoc = cpfCnpj.replace(/\D/g, "")
      const documentType = cleanDoc.length === 14 ? "cnpj" : "cpf"

      const hasEmail = !!(client.Email && client.Email.trim() !== "")

      // Check all phone fields - priority: Telefone > Telefone 1 > Telefone 2
      const telefone = client.Telefone && client.Telefone.trim() !== "" ? client.Telefone.trim() : null
      const telefone1 = client["Telefone 1"] && client["Telefone 1"].trim() !== "" ? client["Telefone 1"].trim() : null
      const telefone2 = client["Telefone 2"] && client["Telefone 2"].trim() !== "" ? client["Telefone 2"].trim() : null

      // Best phone = first non-null
      const bestPhone = telefone || telefone1 || telefone2
      const hasPhone = !!bestPhone

      let status: "complete" | "no_email" | "no_phone" | "no_data"
      if (hasEmail && hasPhone) {
        status = "complete"
      } else if (!hasEmail && !hasPhone) {
        status = "no_data"
      } else if (!hasEmail) {
        status = "no_email"
      } else {
        status = "no_phone"
      }

      return {
        id: client.id,
        name: client.Cliente || "",
        cpf_cnpj: cpfCnpj,
        document_type: documentType,
        email: client.Email || null,
        phone: bestPhone,
        phone2: telefone2 || (telefone1 && telefone ? telefone1 : null), // Secondary phone if available
        last_assertiva_query: lastQueryMap.get(client.id) || null,
        status,
      }
    })

    return NextResponse.json({
      clients: formattedClients,
      pagination: {
        total: count || 0,
        page,
        per_page: perPage,
        total_pages: Math.ceil((count || 0) / perPage),
      },
      summary: {
        total,
        with_email: withEmail,
        without_email: total - withEmail,
        with_phone: withPhone,
        without_phone: total - withPhone,
      },
    })
  } catch (error: any) {
    console.error("[Localize API] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error.message },
      { status: 500 }
    )
  }
}
