import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

// ============================================================================
// SINGLE SOURCE OF TRUTH: All filtering uses these functions
// ============================================================================

interface LocalizeLogInfo {
  queried: boolean
  lastQueryDate: string | null
  emailFound: boolean | null  // null = never queried, true = found, false = not found
  phoneFound: boolean | null
}

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
// Now includes localize query info for more precise filtering
function applyFilter(
  clients: any[],
  filter: string,
  localizeMap: Map<string, LocalizeLogInfo>
): any[] {
  switch (filter) {
    case "no_email":
      // All clients without email (regardless of query status)
      return clients.filter((c) => !hasEmailValue(c))
    case "no_phone":
      // All clients without phone (regardless of query status)
      return clients.filter((c) => !hasPhoneValue(c))
    case "incomplete":
      // Incomplete = no email OR no phone (UNION, not intersection)
      return clients.filter((c) => !hasEmailValue(c) || !hasPhoneValue(c))
    case "localize_no_email":
      // Queried via Localize but no email was found
      return clients.filter((c) => {
        const info = localizeMap.get(c.id)
        return !hasEmailValue(c) && info?.queried && info?.emailFound === false
      })
    case "localize_no_phone":
      // Queried via Localize but no phone was found
      return clients.filter((c) => {
        const info = localizeMap.get(c.id)
        return !hasPhoneValue(c) && info?.queried && info?.phoneFound === false
      })
    case "never_queried":
      // Never queried via Localize and missing data
      return clients.filter((c) => {
        const info = localizeMap.get(c.id)
        return (!hasEmailValue(c) || !hasPhoneValue(c)) && !info?.queried
      })
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
    // STEP 1: Fetch ALL clients for this company using KEYSET pagination
    // NOTE: Using .gt() cursor instead of .range() because .range() returns stale data
    // This is a known Supabase caching issue with OFFSET-based pagination
    // ========================================================================
    let allClients: any[] = []
    let lastCliente: string | null = null
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from("VMAX")
        .select(`id, Cliente, "CPF/CNPJ", Email, "Telefone 1", "Telefone 2", id_company, created_at, updated_at`)
        .eq("id_company", companyId)
        .order("Cliente", { ascending: true })
        .limit(pageSize)

      // Use cursor-based pagination (keyset) instead of offset
      if (lastCliente !== null) {
        query = query.gt("Cliente", lastCliente)
      }

      const { data: pageData, error: fetchError } = await query

      if (fetchError) {
        console.error("[Localize API] Error fetching clients:", fetchError)
        return NextResponse.json(
          { error: "Erro ao buscar clientes", details: fetchError.message },
          { status: 500 }
        )
      }

      if (pageData && pageData.length > 0) {
        allClients = [...allClients, ...pageData]
        lastCliente = pageData[pageData.length - 1].Cliente
        hasMore = pageData.length === pageSize
      } else {
        hasMore = false
      }
    }

    // ========================================================================
    // STEP 2: Fetch ALL Localize logs for this company to build query status map
    // ========================================================================
    const allClientIds = allClients.map((c) => c.id)
    const localizeMap = new Map<string, LocalizeLogInfo>()

    // Fetch logs in chunks to avoid query limits
    const logChunkSize = 500
    for (let i = 0; i < allClientIds.length; i += logChunkSize) {
      const chunkIds = allClientIds.slice(i, i + logChunkSize)
      const { data: logData } = await supabase
        .from("assertiva_localize_logs")
        .select("client_id, created_at, best_email, best_phone, query_status")
        .eq("company_id", companyId)
        .in("client_id", chunkIds)
        .order("created_at", { ascending: false })

      for (const log of logData || []) {
        // Only keep the most recent log per client
        if (!localizeMap.has(log.client_id)) {
          localizeMap.set(log.client_id, {
            queried: true,
            lastQueryDate: log.created_at,
            // If query was successful, check if email/phone were found
            emailFound: log.query_status === "error" ? null : (log.best_email ? true : false),
            phoneFound: log.query_status === "error" ? null : (log.best_phone ? true : false),
          })
        }
      }
    }

    // ========================================================================
    // STEP 3: Calculate summary stats using the SAME filter functions
    // ========================================================================
    const total = allClients.length
    const withEmailList = allClients.filter((c) => hasEmailValue(c))
    const withPhoneList = allClients.filter((c) => hasPhoneValue(c))

    const withEmail = withEmailList.length
    const withPhone = withPhoneList.length
    const withoutEmail = total - withEmail
    const withoutPhone = total - withPhone

    // Calculate Localize-specific stats
    const localizeNoEmail = allClients.filter((c) => {
      const info = localizeMap.get(c.id)
      return !hasEmailValue(c) && info?.queried && info?.emailFound === false
    }).length

    const localizeNoPhone = allClients.filter((c) => {
      const info = localizeMap.get(c.id)
      return !hasPhoneValue(c) && info?.queried && info?.phoneFound === false
    }).length

    const neverQueried = allClients.filter((c) => {
      const info = localizeMap.get(c.id)
      return (!hasEmailValue(c) || !hasPhoneValue(c)) && !info?.queried
    }).length

    console.log(`[Localize API] Stats: total=${total}, withEmail=${withEmail}, withoutEmail=${withoutEmail}, withPhone=${withPhone}, withoutPhone=${withoutPhone}, localizeNoEmail=${localizeNoEmail}, localizeNoPhone=${localizeNoPhone}, neverQueried=${neverQueried}`)

    // ========================================================================
    // STEP 4: Apply search filter (if any)
    // ========================================================================
    let searchFilteredClients = applySearch(allClients, search)

    // ========================================================================
    // STEP 5: Apply category filter using the SAME functions as counting
    // ========================================================================
    const filteredClients = applyFilter(searchFilteredClients, filter, localizeMap)
    const totalFilteredCount = filteredClients.length

    // ========================================================================
    // STEP 6: Apply pagination
    // ========================================================================
    const offset = (page - 1) * perPage
    const clients = filteredClients.slice(offset, offset + perPage)

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

      // Get Localize info
      const localizeInfo = localizeMap.get(client.id)

      // Get phone values with String() for safety
      const telefone1 = client["Telefone 1"] && String(client["Telefone 1"]).trim() !== ""
        ? String(client["Telefone 1"]).trim()
        : null
      const telefone2 = client["Telefone 2"] && String(client["Telefone 2"]).trim() !== ""
        ? String(client["Telefone 2"]).trim()
        : null
      const bestPhone = telefone1 || telefone2

      // Determine status with Localize context
      let status: "complete" | "no_email" | "no_phone" | "no_data" | "localize_no_email" | "localize_no_phone" | "localize_no_data"
      if (hasEmail && hasPhone) {
        status = "complete"
      } else if (!hasEmail && !hasPhone) {
        // Check if Localize was queried
        if (localizeInfo?.queried && localizeInfo.emailFound === false && localizeInfo.phoneFound === false) {
          status = "localize_no_data"
        } else {
          status = "no_data"
        }
      } else if (!hasEmail) {
        // Check if Localize was queried for email
        if (localizeInfo?.queried && localizeInfo.emailFound === false) {
          status = "localize_no_email"
        } else {
          status = "no_email"
        }
      } else {
        // Has email but no phone
        if (localizeInfo?.queried && localizeInfo.phoneFound === false) {
          status = "localize_no_phone"
        } else {
          status = "no_phone"
        }
      }

      return {
        id: client.id,
        name: client.Cliente || "",
        cpf_cnpj: cpfCnpj,
        document_type: documentType,
        email: client.Email ? String(client.Email).trim() || null : null,
        phone: bestPhone,
        phone2: telefone2 && telefone1 ? telefone2 : null,
        last_assertiva_query: localizeInfo?.lastQueryDate || null,
        localize_queried: localizeInfo?.queried || false,
        localize_email_found: localizeInfo?.emailFound,
        localize_phone_found: localizeInfo?.phoneFound,
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
        without_email: withoutEmail,
        with_phone: withPhone,
        without_phone: withoutPhone,
        // Localize-specific stats
        localize_no_email: localizeNoEmail,
        localize_no_phone: localizeNoPhone,
        never_queried: neverQueried,
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
