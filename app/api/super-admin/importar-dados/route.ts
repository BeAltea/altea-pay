import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface SanitizedRecord {
  document: string
  documentFormatted: string
  documentType: "CPF" | "CNPJ"
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipcode: string
  debtAmount: number
  dueDate: string
  contractNumber: string
  daysOverdue: number
  notes: string
  isDuplicate: boolean
  duplicateCount: number
  originalRows: number[]
  validationErrors: string[]
  isValid: boolean
}

interface ImportRequest {
  companyId: string
  records: SanitizedRecord[]
}

export async function POST(request: NextRequest) {
  try {
    // Verify the user is a super admin
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const body: ImportRequest = await request.json()
    const { companyId, records } = body

    if (!companyId) {
      return NextResponse.json({ error: "ID da empresa é obrigatório" }, { status: 400 })
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ error: "Nenhum registro para importar" }, { status: 400 })
    }

    console.log(`[Importar Dados] Starting import of ${records.length} records for company ${companyId}`)

    const adminClient = createAdminClient()

    // Verify company exists
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    let imported = 0
    let failed = 0
    const errors: string[] = []

    // Get existing customers for this company to check duplicates
    const { data: existingCustomers } = await adminClient
      .from("customers")
      .select("id, document")
      .eq("company_id", companyId)

    const existingDocuments = new Set(
      existingCustomers?.map(c => c.document.replace(/[^\d]/g, "")) || []
    )

    // Process records in batches for better performance
    const batchSize = 100
    const validRecords = records.filter(r => r.isValid)

    for (let i = 0; i < validRecords.length; i += batchSize) {
      const batch = validRecords.slice(i, i + batchSize)

      for (const record of batch) {
        try {
          // Skip if document already exists in company
          if (existingDocuments.has(record.document)) {
            console.log(`[Importar Dados] Skipping existing document: ${record.document}`)
            continue
          }

          // Insert customer
          const { data: insertedCustomer, error: insertError } = await adminClient
            .from("customers")
            .insert({
              company_id: companyId,
              name: record.name,
              document: record.document,
              document_type: record.documentType,
              email: record.email || null,
              phone: record.phone || null,
              address: record.address || null,
              city: record.city || null,
              state: record.state || null,
              zip_code: record.zipcode || null,
              notes: record.notes || null,
              source_system: "import",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select("id")
            .single()

          if (insertError) {
            console.error(`[Importar Dados] Error inserting customer:`, insertError)
            errors.push(`${record.document}: ${insertError.message}`)
            failed++
            continue
          }

          // If there's debt information, insert it
          if (record.debtAmount > 0 && insertedCustomer) {
            const { error: debtError } = await adminClient
              .from("debts")
              .insert({
                company_id: companyId,
                customer_id: insertedCustomer.id,
                amount: record.debtAmount,
                original_amount: record.debtAmount,
                due_date: record.dueDate || null,
                days_overdue: record.daysOverdue || 0,
                contract_number: record.contractNumber || null,
                description: record.notes || "Importado via sistema",
                status: "pending",
                classification: record.daysOverdue > 90 ? "critical" :
                               record.daysOverdue > 60 ? "high" :
                               record.daysOverdue > 30 ? "medium" : "low",
                source_system: "import",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })

            if (debtError) {
              console.error(`[Importar Dados] Error inserting debt:`, debtError)
              // Don't fail the customer import if debt insert fails
            }
          }

          // Also add to company_email_recipients if email exists
          if (record.email && insertedCustomer) {
            await adminClient
              .from("company_email_recipients")
              .upsert({
                company_id: companyId,
                client_email: record.email.toLowerCase().trim(),
                client_name: record.name,
                created_at: new Date().toISOString(),
              }, {
                onConflict: "company_id,client_email",
                ignoreDuplicates: true,
              })
          }

          imported++
          existingDocuments.add(record.document) // Mark as existing for subsequent batches
        } catch (error: any) {
          console.error(`[Importar Dados] Error processing record:`, error)
          errors.push(`${record.document}: ${error.message}`)
          failed++
        }
      }
    }

    console.log(`[Importar Dados] Import complete: ${imported} imported, ${failed} failed`)

    return NextResponse.json({
      success: true,
      imported,
      failed,
      errors: errors.slice(0, 10), // Limit errors returned
      message: `Importação concluída: ${imported} clientes importados${failed > 0 ? `, ${failed} falharam` : ""}`,
    })
  } catch (error: any) {
    console.error("[Importar Dados] Error:", error)
    return NextResponse.json(
      { error: error.message || "Erro interno" },
      { status: 500 }
    )
  }
}
