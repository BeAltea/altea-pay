import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { cpfCnpj } = await request.json()

    if (!cpfCnpj) {
      return NextResponse.json({ error: "CPF/CNPJ é obrigatório" }, { status: 400 })
    }

    const supabase = await createClient()

    const cleanCpfCnpj = cpfCnpj.replace(/\D/g, "")
    const formattedCpfCnpj = cpfCnpj

    console.log(`[v0] 🔍 Buscando CPF/CNPJ: ${cleanCpfCnpj} / ${formattedCpfCnpj}`)

    const { data: companies } = await supabase.from("companies").select("id, name, cnpj, customer_table_name")

    const tablesToSearch: string[] = []

    // Adicionar tabelas das empresas
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
        // Tentar com diferentes nomes de colunas possíveis
        const possibleColumns = ["CPF/CNPJ", "cpf_cnpj", "cpf", "cnpj", "document"]

        for (const colName of possibleColumns) {
          try {
            const { data: foundData, error: searchError } = await supabase
              .from(tableName)
              .select("*")
              .or(`${colName}.eq.${cleanCpfCnpj},${colName}.eq.${formattedCpfCnpj}`)
              .maybeSingle()

            if (foundData && !searchError) {
              console.log(`[v0] ✅ ENCONTRADO em ${tableName} coluna ${colName}!`)

              const matchingCompany = companies?.find(
                (c) =>
                  c.customer_table_name === tableName ||
                  c.name.toUpperCase() === tableName.toUpperCase() ||
                  c.name.toUpperCase().replace(/\s+/g, "_") === tableName.toUpperCase(),
              )

              return NextResponse.json({
                found: true,
                table: tableName,
                data: foundData,
                company_id: matchingCompany?.id || null,
                company_name: matchingCompany?.name || tableName,
                column_used: colName,
              })
            }
          } catch (colError) {
            // Coluna não existe nesta tabela, tentar próxima
            continue
          }
        }
      } catch (tableError) {
        console.log(`[v0] ⚠️ Tabela ${tableName} não existe ou erro ao acessar`)
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
