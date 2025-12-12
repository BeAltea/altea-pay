import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    console.log("[v0] 🔍 API get-user-debts - Starting...")

    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log("[v0] ❌ User error:", userError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] 👤 User ID:", user.id)

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    console.log("[v0] 📋 Profile data:", profile)
    console.log("[v0] 📋 Profile error:", profileError)

    if (!profile) {
      console.log("[v0] ⚠️ No profile found")
      return NextResponse.json({ debts: [] })
    }

    // Check if profile has CPF/CNPJ
    if (!profile.cpf_cnpj) {
      console.log("[v0] ⚠️ User has no CPF/CNPJ in profile, returning empty")
      return NextResponse.json({ debts: [] })
    }

    console.log("[v0] 📋 User CPF/CNPJ:", profile.cpf_cnpj)

    const cleanCpfCnpj = profile.cpf_cnpj.replace(/\D/g, "")
    const formattedCpfCnpj = profile.cpf_cnpj

    const serviceSupabase = createServiceClient()

    const allDebts: any[] = []
    const tablesToSearch = ["VMAX", "EMPRESA1", "EMPRESA2", "CLIENTES", "CUSTOMERS"]

    for (const tableName of tablesToSearch) {
      try {
        console.log(`[v0] 🔍 Searching in table: ${tableName}`)

        // Fetch ALL records from table (service role bypasses RLS)
        const { data: allRecords, error: fetchError } = await serviceSupabase.from(tableName).select("*").limit(1000)

        if (fetchError) {
          console.log(`[v0] ⚠️ Table ${tableName} not accessible:`, fetchError.message)
          continue
        }

        console.log(`[v0] 📊 Table ${tableName}: ${allRecords?.length || 0} records`)

        // Filter manually by CPF/CNPJ
        const matchingRecords = (allRecords || []).filter((record: any) => {
          const possibleColumns = ["CPF/CNPJ", "cpf_cnpj", "cpf", "cnpj", "document"]

          for (const col of possibleColumns) {
            if (!record[col]) continue

            const value = String(record[col])
            const cleanValue = value.replace(/\D/g, "")

            if (cleanValue === cleanCpfCnpj || value === formattedCpfCnpj) {
              console.log(`[v0] ✅ MATCH in ${tableName}.${col}:`, value)
              return true
            }
          }
          return false
        })

        console.log(`[v0] 📋 Found ${matchingRecords.length} matching records in ${tableName}`)

        if (matchingRecords.length > 0) {
          // Get company info
          let companyId = profile.company_id
          let companyName = tableName

          if (tableName === "VMAX") {
            const { data: vmaxCompany } = await serviceSupabase
              .from("companies")
              .select("id, name")
              .eq("name", "VMAX")
              .single()

            if (vmaxCompany) {
              companyId = vmaxCompany.id
              companyName = vmaxCompany.name
            }
          }

          // Convert to standard debt format
          const formattedDebts = matchingRecords.map((debt) => {
            // Parse amount
            let amount = 0
            if (debt.Vencido) {
              const vencidoStr = String(debt.Vencido)
              const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
              amount = Number.parseFloat(cleanValue) || 0
            } else if (debt.amount) {
              amount = Number.parseFloat(debt.amount) || 0
            }

            // Parse days overdue
            let daysOverdue = 0
            if (debt.Dias_Inad) {
              daysOverdue = Number.parseInt(String(debt.Dias_Inad).replace(/\D/g, "")) || 0
            } else if (debt.days_overdue) {
              daysOverdue = debt.days_overdue
            }

            // Due date
            const dueDate = debt.Primeira_Vencida || debt.due_date || new Date().toISOString()

            return {
              id: debt.id,
              user_id: user.id,
              customer_id: null,
              amount: amount,
              due_date: dueDate,
              status: daysOverdue > 0 ? "overdue" : "open",
              description: `Fatura - ${debt.Cliente || debt.name || "Sem descrição"}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              propensity_payment_score: 0,
              propensity_loan_score: 0,
              classification: daysOverdue > 90 ? "high_risk" : daysOverdue > 30 ? "medium_risk" : "low_risk",
              source_system: tableName,
              external_id: debt.id,
              company_id: companyId,
              company_name: companyName,
              days_overdue: daysOverdue,
              // IMPORTANTE: NÃO incluir dados da Assertiva que o cliente não pode ver
            }
          })

          allDebts.push(...formattedDebts)
        }
      } catch (error) {
        console.error(`[v0] ❌ Error searching ${tableName}:`, error)
      }
    }

    console.log(`[v0] ✅ Total debts found: ${allDebts.length}`)

    return NextResponse.json({ debts: allDebts })
  } catch (error: any) {
    console.error("[v0] ❌ Error in get-user-debts API:", error)
    return NextResponse.json({ error: "Internal server error", details: error?.message }, { status: 500 })
  }
}
