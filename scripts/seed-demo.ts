import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Função auxiliar para gerar CPF válido
function generateCPF(): string {
  const randomDigits = () => Math.floor(Math.random() * 10)
  const cpf = Array.from({ length: 9 }, randomDigits)

  // Calcula primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += cpf[i] * (10 - i)
  }
  cpf.push(((sum * 10) % 11) % 10)

  // Calcula segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += cpf[i] * (11 - i)
  }
  cpf.push(((sum * 10) % 11) % 10)

  return cpf.join("")
}

// Função auxiliar para gerar CNPJ válido
function generateCNPJ(): string {
  const randomDigits = () => Math.floor(Math.random() * 10)
  const cnpj = Array.from({ length: 12 }, randomDigits)

  // Calcula primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += cnpj[i] * weights1[i]
  }
  cnpj.push(sum % 11 < 2 ? 0 : 11 - (sum % 11))

  // Calcula segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += cnpj[i] * weights2[i]
  }
  cnpj.push(sum % 11 < 2 ? 0 : 11 - (sum % 11))

  return cnpj.join("")
}

// Dados das empresas
const companies = [
  {
    name: "Sabesp",
    cnpj: "43998431000135",
    email: "contato@sabesp.com.br",
    phone: "11987654321",
    address: "Rua Costa Carvalho, 300 - Pinheiros, São Paulo - SP",
    status: "active" as const,
  },
  {
    name: "Enel",
    cnpj: "61695227000193",
    email: "contato@enel.com.br",
    phone: "11912345678",
    address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
    status: "active" as const,
  },
  {
    name: "ProvedorX Telecom",
    cnpj: "12345678000190",
    email: "contato@provedorx.com.br",
    phone: "11999887766",
    address: "Rua das Flores, 500 - Centro, São Paulo - SP",
    status: "active" as const,
  },
]

// Nomes fictícios para clientes
const firstNames = [
  "João",
  "Maria",
  "José",
  "Ana",
  "Pedro",
  "Carla",
  "Lucas",
  "Juliana",
  "Carlos",
  "Fernanda",
  "Rafael",
  "Beatriz",
  "Marcos",
  "Patrícia",
  "Bruno",
  "Amanda",
  "Felipe",
  "Camila",
  "Ricardo",
  "Larissa",
  "Rodrigo",
  "Gabriela",
]

const lastNames = [
  "Silva",
  "Santos",
  "Oliveira",
  "Souza",
  "Lima",
  "Pereira",
  "Costa",
  "Ferreira",
  "Rodrigues",
  "Almeida",
  "Nascimento",
  "Araújo",
  "Carvalho",
  "Ribeiro",
  "Martins",
  "Rocha",
  "Alves",
  "Monteiro",
  "Mendes",
  "Barbosa",
]

const streets = [
  "Rua das Flores",
  "Av. Paulista",
  "Rua Augusta",
  "Av. Brasil",
  "Rua da Consolação",
  "Rua Oscar Freire",
  "Av. Faria Lima",
  "Rua Haddock Lobo",
]

async function seedDatabase() {
  console.log("[v0] 🌱 Iniciando seed do banco de dados...\n")

  try {
    // 1. Criar empresas
    console.log("[v0] 📊 Criando empresas...")
    const { data: createdCompanies, error: companiesError } = await supabase
      .from("companies")
      .insert(companies)
      .select()

    if (companiesError) {
      console.error("[v0] ❌ Erro ao criar empresas:", companiesError)
      return
    }

    console.log(`[v0] ✅ ${createdCompanies.length} empresas criadas com sucesso!\n`)

    // 2. Para cada empresa, criar clientes e dívidas
    for (const company of createdCompanies) {
      console.log(`[v0] 👥 Criando clientes para ${company.name}...`)

      const numClients = Math.floor(Math.random() * 51) + 50 // 50-100 clientes
      const clients = []

      for (let i = 0; i < numClients; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
        const street = streets[Math.floor(Math.random() * streets.length)]
        const number = Math.floor(Math.random() * 1000) + 1

        clients.push({
          company_id: company.id,
          name: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
          phone: `11${Math.floor(Math.random() * 900000000) + 100000000}`,
          cpf: generateCPF(),
          address: `${street}, ${number}`,
          status: "active" as const,
        })
      }

      const { data: createdClients, error: clientsError } = await supabase.from("customers").insert(clients).select()

      if (clientsError) {
        console.error(`[v0] ❌ Erro ao criar clientes para ${company.name}:`, clientsError)
        continue
      }

      console.log(`[v0] ✅ ${createdClients.length} clientes criados para ${company.name}`)

      // 3. Criar dívidas para 70% dos clientes
      console.log(`[v0] 💰 Criando dívidas para ${company.name}...`)

      const clientsWithDebts = createdClients
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(createdClients.length * 0.7))

      const debts = []

      for (const client of clientsWithDebts) {
        const numDebts = Math.floor(Math.random() * 3) + 1 // 1-3 dívidas por cliente

        for (let i = 0; i < numDebts; i++) {
          const amount = Math.floor(Math.random() * 2000) + 100 // R$ 100 - R$ 2100
          const daysOffset = Math.floor(Math.random() * 180) - 90 // -90 a +90 dias
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + daysOffset)

          const isOverdue = dueDate < new Date()
          const daysOverdue = isOverdue
            ? Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0

          let riskLevel: "critical" | "high" | "medium" | "low"
          if (daysOverdue > 90) riskLevel = "critical"
          else if (daysOverdue > 60) riskLevel = "high"
          else if (daysOverdue > 30) riskLevel = "medium"
          else riskLevel = "low"

          debts.push({
            company_id: company.id,
            customer_id: client.id,
            amount,
            due_date: dueDate.toISOString().split("T")[0],
            status: isOverdue ? ("overdue" as const) : ("pending" as const),
            description: `Fatura ${company.name} - ${new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
            risk_level: riskLevel,
          })
        }
      }

      const { data: createdDebts, error: debtsError } = await supabase.from("debts").insert(debts).select()

      if (debtsError) {
        console.error(`[v0] ❌ Erro ao criar dívidas para ${company.name}:`, debtsError)
        continue
      }

      console.log(`[v0] ✅ ${createdDebts.length} dívidas criadas para ${company.name}\n`)
    }

    console.log("[v0] 🎉 Seed concluído com sucesso!")
    console.log("[v0] 📊 Resumo:")
    console.log(`[v0]   - ${createdCompanies.length} empresas`)
    console.log(`[v0]   - ~${createdCompanies.length * 75} clientes (média)`)
    console.log(`[v0]   - ~${createdCompanies.length * 75 * 0.7 * 2} dívidas (média)`)
  } catch (error) {
    console.error("[v0] ❌ Erro inesperado:", error)
  }
}

// Executar seed
seedDatabase()
