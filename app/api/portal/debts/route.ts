import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export const dynamic = "force-dynamic"

interface PortalDebt {
  id: string
  company_name: string
  company_id: string
  description: string
  amount: number
  due_date: string
  days_overdue: number
  status: string
  agreement_id?: string
  asaas_payment_url?: string
  asaas_pix_qrcode_url?: string
  asaas_boleto_url?: string
  payment_status?: string
}

async function getSessionClient(request: NextRequest) {
  const token = request.cookies.get("portal_token")?.value

  if (!token) {
    return null
  }

  const supabase = createServiceClient()

  // Find valid session
  const { data: session } = await supabase
    .from("final_client_sessions")
    .select("final_client_id, expires_at")
    .eq("token", token)
    .single()

  if (!session) {
    return null
  }

  // Check if expired
  if (new Date(session.expires_at) < new Date()) {
    // Delete expired session
    await supabase.from("final_client_sessions").delete().eq("token", token)
    return null
  }

  // Get client
  const { data: client } = await supabase
    .from("final_clients")
    .select("id, email, document, document_type, name, is_active")
    .eq("id", session.final_client_id)
    .single()

  if (!client || !client.is_active) {
    return null
  }

  return client
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated client
    const client = await getSessionClient(request)

    if (!client) {
      return NextResponse.json(
        { error: "Nao autorizado" },
        { status: 401 }
      )
    }

    const supabase = createServiceClient()
    const cleanDocument = client.document.replace(/\D/g, "")
    const debts: PortalDebt[] = []

    console.log(`[PORTAL-DEBTS] Fetching debts for document: ${cleanDocument}`)

    // Search in multiple tables that may contain debts
    const tablesToSearch = ["VMAX", "customers", "clients"]

    for (const tableName of tablesToSearch) {
      try {
        // Determine the document column based on table
        let documentColumn = "document"
        if (tableName === "VMAX") {
          documentColumn = "CPF/CNPJ"
        } else if (tableName === "clients") {
          documentColumn = "document_number"
        }

        // Fetch records from the table
        let query = supabase.from(tableName).select("*")

        // For VMAX, we need to filter differently
        if (tableName === "VMAX") {
          // Get all records and filter in memory due to special column name
          const { data: records, error } = await query

          if (error) {
            console.log(`[PORTAL-DEBTS] Table ${tableName} not accessible:`, error.message)
            continue
          }

          // Filter by document
          const matchingRecords = (records || []).filter((record: any) => {
            const docValue = record["CPF/CNPJ"]
            if (!docValue) return false
            const cleanValue = String(docValue).replace(/\D/g, "")
            return cleanValue === cleanDocument
          })

          // Get company info
          const { data: vmaxCompany } = await supabase
            .from("companies")
            .select("id, name")
            .eq("name", "VMAX")
            .single()

          for (const record of matchingRecords) {
            // Parse amount from Vencido field
            let amount = 0
            if (record.Vencido) {
              const vencidoStr = String(record.Vencido)
              const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
              amount = parseFloat(cleanValue) || 0
            }

            // Parse days overdue
            let daysOverdue = 0
            if (record["Dias Inad."]) {
              daysOverdue = parseInt(String(record["Dias Inad."]).replace(/\D/g, "")) || 0
            }

            // Try to find associated agreement
            const { data: agreement } = await supabase
              .from("agreements")
              .select("id, asaas_payment_url, asaas_pix_qrcode_url, asaas_boleto_url, payment_status, status")
              .eq("vmax_id", record.id)
              .single()

            debts.push({
              id: record.id,
              company_name: vmaxCompany?.name || "VMAX",
              company_id: vmaxCompany?.id || "",
              description: `Fatura - ${record.Cliente || "Sem descricao"}`,
              amount,
              due_date: record.Vecto || new Date().toISOString(),
              days_overdue: daysOverdue,
              status: daysOverdue > 0 ? "overdue" : "open",
              agreement_id: agreement?.id,
              asaas_payment_url: agreement?.asaas_payment_url,
              asaas_pix_qrcode_url: agreement?.asaas_pix_qrcode_url,
              asaas_boleto_url: agreement?.asaas_boleto_url,
              payment_status: agreement?.payment_status || agreement?.status,
            })
          }
        } else {
          // For customers and clients tables
          const { data: records, error } = await query

          if (error) {
            console.log(`[PORTAL-DEBTS] Table ${tableName} not accessible:`, error.message)
            continue
          }

          const matchingRecords = (records || []).filter((record: any) => {
            const docValue = record[documentColumn] || record.document || record.document_number
            if (!docValue) return false
            const cleanValue = String(docValue).replace(/\D/g, "")
            return cleanValue === cleanDocument
          })

          for (const record of matchingRecords) {
            // Get debts associated with this customer
            const { data: customerDebts } = await supabase
              .from("debts")
              .select(`
                id,
                current_amount,
                due_date,
                days_overdue,
                status,
                company_id,
                companies:company_id (name)
              `)
              .eq("customer_id", record.id)

            for (const debt of customerDebts || []) {
              // Get agreement for this debt
              const { data: agreement } = await supabase
                .from("agreements")
                .select("id, asaas_payment_url, asaas_pix_qrcode_url, asaas_boleto_url, payment_status, status")
                .eq("debt_id", debt.id)
                .single()

              debts.push({
                id: debt.id,
                company_name: (debt as any).companies?.name || "Empresa",
                company_id: debt.company_id,
                description: `Divida ref. ${record.name || record.Cliente || "Cliente"}`,
                amount: debt.current_amount,
                due_date: debt.due_date,
                days_overdue: debt.days_overdue || 0,
                status: debt.status,
                agreement_id: agreement?.id,
                asaas_payment_url: agreement?.asaas_payment_url,
                asaas_pix_qrcode_url: agreement?.asaas_pix_qrcode_url,
                asaas_boleto_url: agreement?.asaas_boleto_url,
                payment_status: agreement?.payment_status || agreement?.status,
              })
            }
          }
        }
      } catch (error) {
        console.error(`[PORTAL-DEBTS] Error searching ${tableName}:`, error)
      }
    }

    // Also search agreements directly by customer document
    try {
      const { data: agreements } = await supabase
        .from("agreements")
        .select(`
          id,
          total_amount,
          first_due_date,
          status,
          payment_status,
          asaas_payment_url,
          asaas_pix_qrcode_url,
          asaas_boleto_url,
          company_id,
          companies:company_id (name),
          debts:debt_id (
            id,
            current_amount,
            due_date,
            days_overdue,
            status
          )
        `)

      // Filter agreements by customer document
      // This requires looking up the customer associated with each agreement
      // For now, we'll skip this as it's covered by the debt lookup above
    } catch (error) {
      console.error("[PORTAL-DEBTS] Error searching agreements:", error)
    }

    // Group by company
    const debtsByCompany: Record<string, PortalDebt[]> = {}
    for (const debt of debts) {
      const key = debt.company_name
      if (!debtsByCompany[key]) {
        debtsByCompany[key] = []
      }
      debtsByCompany[key].push(debt)
    }

    console.log(`[PORTAL-DEBTS] Found ${debts.length} debts for ${client.email}`)

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        email: client.email,
        document_type: client.document_type,
        name: client.name,
      },
      total_debts: debts.length,
      debts_by_company: debtsByCompany,
      debts,
    })
  } catch (error: any) {
    console.error("[PORTAL-DEBTS] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
