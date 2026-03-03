import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { consultarDocumento, LocalizeResult } from "@/services/assertivaLocalizeService"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes max for batch processing

interface SearchRequest {
  client_ids: string[]
  company_id: string
}

interface SearchResultItem {
  client_id: string
  client_name: string
  cpf_cnpj: string
  document_type: "cpf" | "cnpj"
  current_email: string | null
  current_phone: string | null
  found_email: string | null
  found_phones: {
    best: LocalizeResult["phones"]["best"]
    all_moveis: LocalizeResult["phones"]["allMoveis"]
    all_fixos: LocalizeResult["phones"]["allFixos"]
  }
  all_emails: string[]
  status: "success" | "not_found" | "error"
  error_message?: string
  assertiva_protocolo: string | null
}

/**
 * POST /api/super-admin/localize/search
 *
 * Execute Assertiva Localize queries for a list of clients.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const body: SearchRequest = await request.json()
    const { client_ids, company_id } = body

    if (!company_id) {
      return NextResponse.json(
        { error: "company_id é obrigatório" },
        { status: 400 }
      )
    }

    if (!client_ids || !Array.isArray(client_ids) || client_ids.length === 0) {
      return NextResponse.json(
        { error: "client_ids deve ser um array não vazio" },
        { status: 400 }
      )
    }

    if (client_ids.length > 200) {
      return NextResponse.json(
        { error: "Máximo de 200 clientes por requisição" },
        { status: 400 }
      )
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      )
    }

    // Fetch clients from VMAX
    const { data: clients, error: clientsError } = await supabase
      .from("VMAX")
      .select(`id, Cliente, "CPF/CNPJ", Email, "Telefone 1", id_company`)
      .in("id", client_ids)
      .eq("id_company", company_id)

    if (clientsError) {
      console.error("[Localize Search] Error fetching clients:", clientsError)
      return NextResponse.json(
        { error: "Erro ao buscar clientes" },
        { status: 500 }
      )
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { error: "Nenhum cliente encontrado" },
        { status: 404 }
      )
    }

    // Verify all requested clients belong to the company
    if (clients.length !== client_ids.length) {
      const foundIds = new Set(clients.map((c) => c.id))
      const missingIds = client_ids.filter((id) => !foundIds.has(id))
      console.warn(`[Localize Search] Missing clients: ${missingIds.join(", ")}`)
    }

    // Process clients in chunks with rate limiting
    const results: SearchResultItem[] = []
    const chunkSize = 5
    const delayBetweenRequests = 300 // 300ms between individual requests
    const delayBetweenChunks = 1000 // 1s between chunks

    console.log(`[Localize Search] Processing ${clients.length} clients in chunks of ${chunkSize}`)

    for (let i = 0; i < clients.length; i += chunkSize) {
      const chunk = clients.slice(i, i + chunkSize)

      for (let j = 0; j < chunk.length; j++) {
        const client = chunk[j]
        const cpfCnpj = client["CPF/CNPJ"] || ""
        const cleanDoc = cpfCnpj.replace(/\D/g, "")

        if (!cleanDoc) {
          results.push({
            client_id: client.id,
            client_name: client.Cliente || "",
            cpf_cnpj: cpfCnpj,
            document_type: "cpf",
            current_email: client.Email || null,
            current_phone: client["Telefone 1"] || null,
            found_email: null,
            found_phones: {
              best: null,
              all_moveis: [],
              all_fixos: [],
            },
            all_emails: [],
            status: "error",
            error_message: "CPF/CNPJ não informado",
            assertiva_protocolo: null,
          })
          continue
        }

        try {
          // Query Assertiva
          const localizeResult = await consultarDocumento(cleanDoc)

          const resultItem: SearchResultItem = {
            client_id: client.id,
            client_name: client.Cliente || "",
            cpf_cnpj: cpfCnpj,
            document_type: localizeResult.documentType,
            current_email: client.Email || null,
            current_phone: client["Telefone 1"] || null,
            found_email: localizeResult.bestEmail,
            found_phones: {
              best: localizeResult.phones.best,
              all_moveis: localizeResult.phones.allMoveis,
              all_fixos: localizeResult.phones.allFixos,
            },
            all_emails: localizeResult.emails,
            status: localizeResult.success
              ? localizeResult.bestEmail || localizeResult.phones.best
                ? "success"
                : "not_found"
              : "error",
            error_message: localizeResult.error,
            assertiva_protocolo: localizeResult.protocolo || null,
          }

          results.push(resultItem)

          // Log the query to assertiva_localize_logs
          await supabase.from("assertiva_localize_logs").insert({
            company_id,
            client_id: client.id,
            cpf_cnpj: cleanDoc,
            document_type: localizeResult.documentType,
            assertiva_protocolo: localizeResult.protocolo,
            query_status: resultItem.status,
            error_message: localizeResult.error,
            response_payload: localizeResult.rawResponse || null,
            emails_found: localizeResult.emails,
            phones_found: {
              moveis: localizeResult.phones.allMoveis,
              fixos: localizeResult.phones.allFixos,
            },
            best_email: localizeResult.bestEmail,
            best_phone: localizeResult.phones.best?.numero || null,
            best_phone_whatsapp: localizeResult.phones.best?.whatsapp || false,
            email_before: client.Email || null,
            phone_before: client["Telefone 1"] || null,
          })
        } catch (error: any) {
          console.error(`[Localize Search] Error querying ${cleanDoc}:`, error)
          results.push({
            client_id: client.id,
            client_name: client.Cliente || "",
            cpf_cnpj: cpfCnpj,
            document_type: cleanDoc.length === 14 ? "cnpj" : "cpf",
            current_email: client.Email || null,
            current_phone: client["Telefone 1"] || null,
            found_email: null,
            found_phones: {
              best: null,
              all_moveis: [],
              all_fixos: [],
            },
            all_emails: [],
            status: "error",
            error_message: error.message,
            assertiva_protocolo: null,
          })
        }

        // Delay between requests
        if (j < chunk.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenRequests))
        }
      }

      // Delay between chunks
      if (i + chunkSize < clients.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks))
      }
    }

    // Calculate summary
    const summary = {
      total_consulted: results.length,
      success: results.filter((r) => r.status === "success").length,
      emails_found: results.filter((r) => r.found_email).length,
      phones_found: results.filter((r) => r.found_phones.best).length,
      not_found: results.filter((r) => r.status === "not_found").length,
      errors: results.filter((r) => r.status === "error").length,
    }

    console.log(`[Localize Search] Completed:`, summary)

    return NextResponse.json({
      results,
      summary,
    })
  } catch (error: any) {
    console.error("[Localize Search] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error.message },
      { status: 500 }
    )
  }
}
