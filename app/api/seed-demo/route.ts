import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function generateCPF(): string {
  const randomDigits = () => Math.floor(Math.random() * 10)
  const cpf = Array.from({ length: 9 }, randomDigits)

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += cpf[i] * (10 - i)
  }
  cpf.push(((sum * 10) % 11) % 10)

  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += cpf[i] * (11 - i)
  }
  cpf.push(((sum * 10) % 11) % 10)

  return cpf.join("")
}

function generateCNPJ(): string {
  const randomDigits = () => Math.floor(Math.random() * 10)
  const cnpj = Array.from({ length: 12 }, randomDigits)

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += cnpj[i] * weights1[i]
  }
  cnpj.push(sum % 11 < 2 ? 0 : 11 - (sum % 11))

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += cnpj[i] * weights2[i]
  }
  cnpj.push(sum % 11 < 2 ? 0 : 11 - (sum % 11))

  return cnpj.join("")
}

export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret")

    if (!secret || secret !== process.env.CRON_SECRET) {
      console.log("[v0] Tentativa de acesso não autorizado ao seed")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    return await executeSeed()
  } catch (error) {
    console.error("[v0] Erro ao executar seed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao executar seed",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    return await executeSeed()
  } catch (error) {
    console.error("[v0] Erro ao executar seed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao executar seed",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

async function executeSeed() {
  console.log("[v0] Iniciando seed de dados demo...")

  const companies = [
    {
      name: "Sabesp - Saneamento Básico",
      cnpj: "43.776.517/0001-80",
      email: "contato@sabesp.com.br",
      phone: "(11) 3388-8000",
      address: "Rua Costa Carvalho, 300",
      city: "São Paulo",
      state: "SP",
      zip_code: "05429-900",
      sector: "Saneamento",
    },
    {
      name: "Enel Distribuição SP",
      cnpj: "61.695.227/0001-93",
      email: "contato@enel.com.br",
      phone: "0800 72 72 120",
      address: "Av. Paulista, 1842",
      city: "São Paulo",
      state: "SP",
      zip_code: "01310-945",
      sector: "Energia",
    },
    {
      name: "ProvedorX Telecom",
      cnpj: "12.345.678/0001-90",
      email: "contato@provedorx.com.br",
      phone: "(11) 4004-1000",
      address: "Av. Brigadeiro Faria Lima, 1461",
      city: "São Paulo",
      state: "SP",
      zip_code: "01452-002",
      sector: "Telecomunicações",
    },
  ]

  console.log("[v0] Criando empresas...")
  const { data: createdCompanies, error: companiesError } = await supabase.from("companies").insert(companies).select()

  if (companiesError) {
    console.error("[v0] Erro ao criar empresas:", companiesError)
    throw companiesError
  }

  console.log(`[v0] ${createdCompanies.length} empresas criadas!`)

  const firstNames = [
    "João",
    "Maria",
    "José",
    "Ana",
    "Pedro",
    "Carla",
    "Paulo",
    "Juliana",
    "Carlos",
    "Fernanda",
    "Lucas",
    "Beatriz",
    "Rafael",
    "Camila",
    "Felipe",
    "Amanda",
    "Bruno",
    "Larissa",
    "Rodrigo",
    "Patrícia",
  ]

  const lastNames = [
    "Silva",
    "Santos",
    "Oliveira",
    "Souza",
    "Rodrigues",
    "Ferreira",
    "Alves",
    "Pereira",
    "Lima",
    "Gomes",
    "Costa",
    "Ribeiro",
    "Martins",
    "Carvalho",
  ]

  let totalCustomers = 0
  let totalDebts = 0

  for (const company of createdCompanies) {
    console.log(`[v0] Criando clientes para ${company.name}...`)

    const numCustomers = Math.floor(Math.random() * 51) + 50
    const customers = []

    for (let i = 0; i < numCustomers; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
      const cpf = generateCPF()

      customers.push({
        company_id: company.id,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
        phone: `(11) 9${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0")}-${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0")}`,
        document: cpf,
        document_type: "CPF",
        address: `Rua ${lastName}, ${Math.floor(Math.random() * 1000) + 1}`,
        city: "São Paulo",
        state: "SP",
        zip_code: `${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 900) + 100}`,
        external_id: `EXT-${company.id.substring(0, 8)}-${i}`,
        source_system: "manual",
      })
    }

    const { data: createdCustomers, error: customersError } = await supabase
      .from("customers")
      .insert(customers)
      .select()

    if (customersError) {
      console.error(`[v0] Erro ao criar clientes para ${company.name}:`, customersError)
      continue
    }

    totalCustomers += createdCustomers.length
    console.log(`[v0] ${createdCustomers.length} clientes criados para ${company.name}`)

    console.log(`[v0] Criando dívidas para ${company.name}...`)
    const debts = []
    const customersWithDebts = createdCustomers.slice(0, Math.floor(createdCustomers.length * 0.7))

    for (const customer of customersWithDebts) {
      const numDebts = Math.floor(Math.random() * 3) + 1

      for (let i = 0; i < numDebts; i++) {
        const amount = Math.floor(Math.random() * 2000) + 100
        const daysOverdue = Math.floor(Math.random() * 180)
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() - daysOverdue)

        let classification: "low" | "medium" | "high" | "critical"
        if (daysOverdue > 90) classification = "critical"
        else if (daysOverdue > 60) classification = "high"
        else if (daysOverdue > 30) classification = "medium"
        else classification = "low"

        debts.push({
          company_id: company.id,
          customer_id: customer.id,
          amount,
          due_date: dueDate.toISOString().split("T")[0],
          status: daysOverdue > 0 ? "overdue" : "pending",
          description: `Fatura ${String(i + 1).padStart(3, "0")}/${new Date().getFullYear()}`,
          classification,
          external_id: `${company.name.substring(0, 3).toUpperCase()}-${Date.now()}-${i}`,
          source_system: "manual",
        })
      }
    }

    const { data: createdDebts, error: debtsError } = await supabase.from("debts").insert(debts).select()

    if (debtsError) {
      console.error(`[v0] Erro ao criar dívidas para ${company.name}:`, debtsError)
      continue
    }

    totalDebts += createdDebts.length
    console.log(`[v0] ${createdDebts.length} dívidas criadas para ${company.name}`)
  }

  console.log("[v0] Seed concluído com sucesso!")

  return NextResponse.json({
    success: true,
    message: "Seed de dados demo concluído com sucesso!",
    summary: {
      companies: createdCompanies.length,
      customers: totalCustomers,
      debts: totalDebts,
    },
  })
}
