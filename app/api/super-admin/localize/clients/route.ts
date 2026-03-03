import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

// ============================================================================
// SINGLE SOURCE OF TRUTH: All filtering uses these functions
// ============================================================================

// Check if client has a valid phone (either Telefone 1 OR Telefone 2)
function hasPhoneValue(client: any): boolean {
  const tel1 = client["Telefone 1"] && String(client["Telefone 1"]).trim() !== ""
  const tel2 = client["Telefone 2"] && String(client["Telefone 2"]).trim() !== ""
  return tel1 || tel2
}

// Check if client has a valid email
function hasEmailValue(client: any): boolean {
  return !!(client.Email && String(client.Email).trim() !== "")
}

// Apply filter to a list of clients - used for BOTH counting and filtering
function applyFilter(clients: any[], filter: string): any[] {
  switch (filter) {
    case "no_email":
      return clients.filter((c) => !hasEmailValue(c))
    case "no_phone":
      return clients.filter((c) => !hasPhoneValue(c))
    case "incomplete":
      // Incomplete = no email OR no phone (UNION, not intersection)
      return clients.filter((c) => !hasEmailValue(c) || !hasPhoneValue(c))
    case "all":
    default:
      return clients
  }
}

// Apply search filter
function applySearch(clients: any[], search: string): any[] {
  if (!search) return clients
  const searchLower = search.toLowerCase()
  return clients.filter((c) => {
    const name = (c.Cliente || "").toLowerCase()
    const doc = (c["CPF/CNPJ"] || "").toLowerCase()
    return name.includes(searchLower) || doc.includes(searchLower)
  })
}

/**
 * GET /api/super-admin/localize/clients
 *
 * Lists clients from VMAX table for a specific company with filters.
 *
 * IMPORTANT: This endpoint uses a SINGLE SOURCE OF TRUTH approach:
 * - Fetch ALL clients for the company once (paginated to avoid Supabase limit)
 * - Apply the SAME filter functions for counting AND for table display
 * - This guarantees counters and filters always match
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

    // ========================================================================
    // STEP 1: Fetch ALL clients for this company (paginated to avoid limits)
    // ========================================================================
    let allClients: any[] = []
    let pageNum = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: pageData, error } = await supabase
        .from("VMAX")
        .select(`id, Cliente, "CPF/CNPJ", Email, "Telefone 1", "Telefone 2", id_company, created_at, updated_at`)
        .eq("id_company", companyId)
        .order("Cliente", { ascending: true })
        .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1)

      if (error) {
        console.error("[Localize API] Error fetching clients:", error)
        return NextResponse.json(
          { error: "Erro ao buscar clientes", details: error.message },
          { status: 500 }
        )
      }

      if (pageData && pageData.length > 0) {
        allClients = [...allClients, ...pageData]
        pageNum++
        hasMore = pageData.length === pageSize
      } else {
        hasMore = false
      }
    }

    // ========================================================================
    // STEP 2: Calculate summary stats using the SAME filter functions
    // ========================================================================
    const total = allClients.length
    const withEmailList = allClients.filter((c) => hasEmailValue(c))
    const withPhoneList = allClients.filter((c) => hasPhoneValue(c))

    const withEmail = withEmailList.length
    const withPhone = withPhoneList.length
    const withoutEmail = total - withEmail
    const withoutPhone = total - withPhone

    // Validation: these MUST be mathematically consistent
    console.log(`[Localize API] Stats: total=${total}, withEmail=${withEmail}, withoutEmail=${withoutEmail}, withPhone=${withPhone}, withoutPhone=${withoutPhone}`)

    // ========================================================================
    // STEP 3: Apply search filter (if any)
    // ========================================================================
    let searchFilteredClients = applySearch(allClients, search)

    // ========================================================================
    // STEP 4: Apply category filter using the SAME functions as counting
    // ========================================================================
    const filteredClients = applyFilter(searchFilteredClients, filter)
    const totalFilteredCount = filteredClients.length

    // ========================================================================
    // STEP 5: Apply pagination
    // ========================================================================
    const offset = (page - 1) * perPage
    const clients = filteredClients.slice(offset, offset + perPage)

    // ========================================================================
    // STEP 6: Get last assertiva query dates for paginated clients
    // ========================================================================
    const clientIds = clients.map((c) => c.id)
    let lastQueryMap = new Map<string, string>()

    if (clientIds.length > 0) {
      const { data: logData } = await supabase
        .from("assertiva_localize_logs")
        .select("client_id, created_at")
        .in("client_id", clientIds)
        .order("created_at", { ascending: false })

      for (const log of logData || []) {
        if (!lastQueryMap.has(log.client_id)) {
          lastQueryMap.set(log.client_id, log.created_at)
        }
      }
    }

    // ========================================================================
    // STEP 7: Format response using the SAME helper functions
    // ========================================================================
    const formattedClients = clients.map((client) => {
      const cpfCnpj = client["CPF/CNPJ"] || ""
      const cleanDoc = cpfCnpj.replace(/\D/g, "")
      const documentType = cleanDoc.length === 14 ? "cnpj" : "cpf"

      // Use the SAME helper functions for consistency
      const hasEmail = hasEmailValue(client)
      const hasPhone = hasPhoneValue(client)

      // Get phone values with String() for safety
      const telefone1 = client["Telefone 1"] && String(client["Telefone 1"]).trim() !== ""
        ? String(client["Telefone 1"]).trim()
        : null
      const telefone2 = client["Telefone 2"] && String(client["Telefone 2"]).trim() !== ""
        ? String(client["Telefone 2"]).trim()
        : null
      const bestPhone = telefone1 || telefone2

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
        email: client.Email ? String(client.Email).trim() || null : null,
        phone: bestPhone,
        phone2: telefone2 && telefone1 ? telefone2 : null,
        last_assertiva_query: lastQueryMap.get(client.id) || null,
        status,
      }
    })

    // ========================================================================
    // STEP 8: Return response with mathematically consistent counters
    // ========================================================================
    return NextResponse.json({
      clients: formattedClients,
      pagination: {
        total: totalFilteredCount,
        page,
        per_page: perPage,
        total_pages: Math.ceil(totalFilteredCount / perPage),
      },
      summary: {
        total,
        with_email: withEmail,
        without_email: withoutEmail,  // Calculated consistently: total - withEmail
        with_phone: withPhone,
        without_phone: withoutPhone,  // Calculated consistently: total - withPhone
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
