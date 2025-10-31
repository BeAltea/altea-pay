import fs from 'fs'

// Dados da empresa VMAX
const COMPANY_DATA = {
  name: 'VMAX',
  document: '07.685.452/0001-01',
  email: 'solange@vmax.com.br',
  phone: '',
  address: 'Rua Antonio Carlos Gilli, 11, Itatiba/SP',
  status: 'active',
}

// Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!')
  process.exit(1)
}

// Headers para requisições ao Supabase
const headers = {
  'Content-Type': 'application/json',
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
}

// Função para fazer requisições ao Supabase
async function supabaseRequest(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`
  const options = {
    method,
    headers,
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(`Erro na requisição: ${JSON.stringify(data)}`)
  }

  return data
}

// Função para limpar valor monetário (R$ 259,80 -> 259.80)
function cleanMoneyValue(value) {
  if (!value) return 0
  return parseFloat(value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim())
}

// Função para converter data (25/06/2025 -> 2025-06-25)
function convertDate(dateStr) {
  if (!dateStr) return null
  const [day, month, year] = dateStr.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// Função para determinar classificação baseada em dias de inadimplência
function getClassification(days) {
  const daysNum = parseInt(days) || 0
  if (daysNum <= 90) return 'low'
  if (daysNum <= 180) return 'medium'
  if (daysNum <= 365) return 'high'
  return 'critical'
}

// Função principal
async function main() {
  console.log('🚀 Iniciando importação da empresa VMAX...\n')

  try {
    // 1. Criar a empresa
    console.log('📋 Criando empresa VMAX...')
    const [company] = await supabaseRequest('companies', 'POST', COMPANY_DATA)
    console.log(`✅ Empresa criada com ID: ${company.id}\n`)

    // 2. Ler o CSV
    console.log('📄 Lendo arquivo CSV...')
    const csvPath = 'user_read_only_context/text_attachments/CLIENTES-COM-FATURAS-EM-ABERTO-TESTE-altpay-OSw8F.csv'
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = csvContent.split('\n').filter((line) => line.trim())

    // Remover header
    const header = lines[0]
    const dataLines = lines.slice(1)

    console.log(`📊 Encontradas ${dataLines.length} linhas de dados\n`)

    // 3. Processar cada linha
    let clientsCreated = 0
    let debtsCreated = 0
    let errors = 0

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i]
      const columns = line.split(';')

      if (columns.length < 6) {
        console.log(`⚠️  Linha ${i + 1} ignorada (dados incompletos)`)
        continue
      }

      const [document, name, amount, dueDate, daysOverdue, city, cancelDate] = columns

      try {
        // Criar cliente
        const customerData = {
          company_id: company.id,
          name: name.trim(),
          document: document.trim(),
          city: city?.trim() || '',
          status: 'active',
        }

        const [customer] = await supabaseRequest('customers', 'POST', customerData)
        clientsCreated++

        // Criar dívida
        const debtData = {
          company_id: company.id,
          customer_id: customer.id,
          amount: cleanMoneyValue(amount),
          due_date: convertDate(dueDate),
          status: cancelDate?.trim() ? 'cancelled' : 'overdue',
          classification: getClassification(daysOverdue),
          description: 'Fatura em aberto',
        }

        await supabaseRequest('debts', 'POST', debtData)
        debtsCreated++

        if ((i + 1) % 10 === 0) {
          console.log(`✅ Processadas ${i + 1}/${dataLines.length} linhas...`)
        }
      } catch (error) {
        errors++
        console.error(`❌ Erro na linha ${i + 1}: ${error.message}`)
      }
    }

    // 4. Resumo final
    console.log('\n' + '='.repeat(50))
    console.log('✅ IMPORTAÇÃO CONCLUÍDA!')
    console.log('='.repeat(50))
    console.log(`📊 Empresa: ${company.name} (ID: ${company.id})`)
    console.log(`👥 Clientes criados: ${clientsCreated}`)
    console.log(`💰 Dívidas criadas: ${debtsCreated}`)
    console.log(`❌ Erros: ${errors}`)
    console.log('='.repeat(50))
  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error.message)
    process.exit(1)
  }
}

// Executar
main()
