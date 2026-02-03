import { createServiceClient } from "@/lib/supabase/service"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, cpfCnpj } = await request.json()

    if (!userId || !cpfCnpj) {
      return NextResponse.json({ error: "Missing userId or cpfCnpj" }, { status: 400 })
    }

    console.log("[v0] API get-user-debts-list: userId:", userId, "CPF:", cpfCnpj)

    const supabase = createServiceClient()

    // Limpar CPF/CNPJ
    const cleanCpfCnpj = cpfCnpj.replace(/[^\d]/g, "")

    // Tabelas para buscar
    const tablesToSearch = ["VMAX", "EMPRESA1", "EMPRESA2", "CLIENTES", "CUSTOMERS"]

    const allDebts: any[] = []

    for (const tableName of tablesToSearch) {
      try {
        console.log(`[v0] 🔍 Searching in table: ${tableName}`)

        const { data: records, error } = await supabase.from(tableName).select("*").limit(1000)

        if (error) {
          console.log(`[v0] ⚠️ Table ${tableName} not accessible:`, error.message)
          continue
        }

        if (!records || records.length === 0) {
          console.log(`[v0] 📊 Table ${tableName}: 0 records`)
          continue
        }

        console.log(`[v0] 📊 Table ${tableName}: ${records.length} records`)

        // Filtrar registros que correspondem ao CPF
        for (const record of records) {
          let found = false

          // Verificar todas as colunas possíveis
          const columnsToCheck = Object.keys(record)

          for (const col of columnsToCheck) {
            const value = record[col]
            if (!value) continue

            const cleanValue = String(value).replace(/[^\d]/g, "")

            if (cleanValue === cleanCpfCnpj || cleanValue === cpfCnpj) {
              found = true
              console.log(`[v0] ✅ MATCH in ${tableName}.${col}: ${value}`)
              break
            }
          }

          if (found) {
            // Converter para formato padrão de dívida
            const debt: any = {
              id: record.id || `${tableName}-${Math.random()}`,
              company_name: record.Empresa || tableName,
              customer_name: record.Cliente || record.customer_name || "Cliente",
              amount:
                Number.parseFloat(String(record.Vencido || record.amount || record.valor || "0").replace(",", ".")) ||
                0,
              due_date: record.Vecto || record.due_date || null,
              days_overdue: Number.parseInt(record["Dias Inad."] || record.days_overdue || "0") || 0,
              status: "overdue",
              cpf_cnpj: record["CPF/CNPJ"] || record.cpf_cnpj || cpfCnpj,
              city: record.Cidade || record.city || null,
              propensity_payment_score: 0,
              propensity_loan_score: 0,
            }

            allDebts.push(debt)
          }
        }
      } catch (tableError) {
        console.error(`[v0] Error searching table ${tableName}:`, tableError)
      }
    }

    console.log(`[v0] ✅ Total debts found: ${allDebts.length}`)

    return NextResponse.json({ debts: allDebts })
  } catch (error) {
    console.error("[v0] API get-user-debts-list error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
