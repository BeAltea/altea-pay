import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { cpfCnpj } = await request.json()

    if (!cpfCnpj) {
      return NextResponse.json({ error: "CPF/CNPJ é obrigatório" }, { status: 400 })
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const cleanCpfCnpj = cpfCnpj.replace(/\D/g, "")
    const formattedCpfCnpj = cpfCnpj

    console.log(`[v0] 🔍 Buscando CPF/CNPJ: ${cleanCpfCnpj} / ${formattedCpfCnpj}`)

    const { data: companies } = await supabaseAdmin.from("companies").select("id, name, cnpj, customer_table_name")

    const vmaxCompany = companies?.find(
      (c) => c.name?.toUpperCase() === "VMAX" || c.customer_table_name?.toUpperCase() === "VMAX",
    )
    console.log(`[v0] 🏢 Empresa VMAX encontrada:`, vmaxCompany?.id)

    const tablesToSearch: string[] = []

    if (companies && companies.length > 0) {
      companies.forEach((company) => {
        const tableName = company.customer_table_name || company.name.toUpperCase()
        if (!tablesToSearch.includes(tableName)) {
          tablesToSearch.push(tableName)
        }
      })
    }

    const commonTables = [
      "VMAX",
      "EMPRESA1",
      "EMPRESA2",
      "EMPRESA3",
      "CLIENTES",
      "CUSTOMERS",
      "DEVEDORES",
      "INADIMPLENTES",
    ]

    commonTables.forEach((table) => {
      if (!tablesToSearch.includes(table)) {
        tablesToSearch.push(table)
      }
    })

    console.log(`[v0] 📋 Total de tabelas para buscar: ${tablesToSearch.length}`)
    console.log(`[v0] 📋 Tabelas: ${tablesToSearch.join(", ")}`)

    for (const tableName of tablesToSearch) {
      console.log(`[v0] 🔍 Buscando em tabela: ${tableName}...`)

      try {
        const { data: allRecords, error: fetchError } = await supabaseAdmin.from(tableName).select("*").limit(1000)

        if (fetchError) {
          console.log(`[v0] ⚠️ Tabela ${tableName} erro: ${fetchError.message}`)
          continue
        }

        console.log(`[v0] 📊 Tabela ${tableName}: ${allRecords?.length || 0} registros encontrados`)

        if (allRecords && allRecords.length > 0) {
          const sampleColumns = Object.keys(allRecords[0])
          console.log(`[v0] 📋 Colunas disponíveis em ${tableName}: ${sampleColumns.slice(0, 10).join(", ")}`)

          const possibleColumns = ["CPF/CNPJ", "cpf_cnpj", "cpf", "cnpj", "document", "Cliente"]

          let recordsChecked = 0
          for (const record of allRecords) {
            recordsChecked++

            for (const colName of possibleColumns) {
              const value = record[colName]
              if (value) {
                const cleanValue = String(value).replace(/\D/g, "")

                if (recordsChecked <= 3) {
                  console.log(`[v0] 🔎 Registro ${recordsChecked} - ${colName}: "${value}" (limpo: "${cleanValue}")`)
                }

                if (cleanValue === cleanCpfCnpj || value === formattedCpfCnpj) {
                  console.log(`[v0] ✅ ENCONTRADO em ${tableName} coluna ${colName}!`)

                  const matchingCompany =
                    companies?.find(
                      (c) =>
                        c.customer_table_name === tableName ||
                        c.name.toUpperCase() === tableName.toUpperCase() ||
                        c.name.toUpperCase().replace(/\s+/g, "_") === tableName.toUpperCase(),
                    ) || vmaxCompany

                  return NextResponse.json({
                    found: true,
                    table: tableName,
                    data: record,
                    company_id: matchingCompany?.id || null,
                    company_name: matchingCompany?.name || tableName,
                    column_used: colName,
                  })
                }
              }
            }
          }

          console.log(`[v0] 🔍 Verificados ${recordsChecked} registros em ${tableName} - CPF não encontrado`)
        }
      } catch (tableError: any) {
        console.log(`[v0] ⚠️ Tabela ${tableName} erro ao acessar: ${tableError?.message || tableError}`)
        continue
      }
    }

    console.log("[v0] ℹ️ CPF/CNPJ não encontrado em nenhuma tabela")

    return NextResponse.json({
      found: false,
      message: "CPF/CNPJ não encontrado em nenhuma tabela",
    })
  } catch (error) {
    console.error("[v0] ❌ Erro na busca:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
