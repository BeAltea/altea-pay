import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
dotenv.config({ path: join(__dirname, "..", ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const asaasApiKey = process.env.ASAAS_API_KEY
const asaasBaseUrl = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Payment status constants
const PAID_AGREEMENT_STATUSES = ["paid", "completed", "pago_ao_cliente"]
const PAID_PAYMENT_STATUSES = ["received", "confirmed"]
const PAID_ASAAS_STATUSES = ["RECEIVED", "RECEIVED_IN_CASH", "CONFIRMED"]

function isPaidStatus(agreementStatus, paymentStatus, asaasStatus) {
  if (agreementStatus && PAID_AGREEMENT_STATUSES.includes(agreementStatus)) return true
  if (paymentStatus && PAID_PAYMENT_STATUSES.includes(paymentStatus)) return true
  if (asaasStatus && PAID_ASAAS_STATUSES.includes(asaasStatus)) return true
  return false
}

async function fetchAsaasPaymentsForCustomer(customerId) {
  if (!asaasApiKey) return []

  const response = await fetch(`${asaasBaseUrl}/payments?customer=${customerId}&limit=100`, {
    headers: {
      "Content-Type": "application/json",
      access_token: asaasApiKey,
    },
  })

  if (!response.ok) {
    console.warn(`Failed to fetch payments for ${customerId}: ${response.status}`)
    return []
  }

  const data = await response.json()
  return data.data || []
}

async function runReconciliation(companyId) {
  console.log("\n========================================")
  console.log("RECONCILIATION TEST")
  console.log("========================================\n")

  // Get company info
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single()

  if (companyError || !company) {
    console.error("Company not found:", companyError?.message)
    return
  }

  console.log(`Company: ${company.name} (${company.id})\n`)

  // Fetch VMAX records with pagination
  console.log("Fetching VMAX records...")
  let vmaxRecords = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data: pageData } = await supabase
      .from("VMAX")
      .select('id, "CPF/CNPJ", Cliente, Vencido, negotiation_status')
      .eq("id_company", companyId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!pageData || pageData.length === 0) break
    vmaxRecords = [...vmaxRecords, ...pageData]
    if (pageData.length < pageSize) break
    page++
  }
  console.log(`  Found ${vmaxRecords.length} VMAX records`)

  // Fetch agreements with pagination
  console.log("Fetching agreements...")
  let allAgreements = []
  page = 0

  while (true) {
    const { data: pageData } = await supabase
      .from("agreements")
      .select("id, customer_id, status, payment_status, asaas_status, asaas_payment_id, asaas_customer_id, agreed_amount")
      .eq("company_id", companyId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!pageData || pageData.length === 0) break
    allAgreements = [...allAgreements, ...pageData]
    if (pageData.length < pageSize) break
    page++
  }
  console.log(`  Found ${allAgreements.length} agreements`)

  // Calculate AlteaPay metrics
  const activeAgreements = allAgreements.filter(a => a.status !== "cancelled")
  const agreementsWithAsaas = activeAgreements.filter(a => a.asaas_payment_id)
  const paidAgreements = activeAgreements.filter(a => isPaidStatus(a.status, a.payment_status, a.asaas_status))
  const cancelledAgreements = allAgreements.filter(a => a.status === "cancelled")

  // Calculate total debt from VMAX
  let totalDebt = 0
  vmaxRecords.forEach(v => {
    const vencidoStr = String(v.Vencido || "0")
    const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    totalDebt += Number(cleanValue) || 0
  })

  // Calculate recovered debt from paid agreements
  const recoveredDebt = paidAgreements.reduce((sum, a) => sum + (Number(a.agreed_amount) || 0), 0)

  console.log("\n--- ALTEAPAY METRICS ---")
  console.log(`VMAX Records:       ${vmaxRecords.length}`)
  console.log(`Total Agreements:   ${allAgreements.length}`)
  console.log(`  - Active:         ${activeAgreements.length}`)
  console.log(`  - With ASAAS:     ${agreementsWithAsaas.length}`)
  console.log(`  - Paid:           ${paidAgreements.length}`)
  console.log(`  - Cancelled:      ${cancelledAgreements.length}`)
  console.log(`Total Debt:         R$ ${totalDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  console.log(`Recovered Debt:     R$ ${recoveredDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)

  // Get unique ASAAS customer IDs
  const asaasCustomerIds = Array.from(new Set(agreementsWithAsaas.map(a => a.asaas_customer_id).filter(Boolean)))
  console.log(`\nUnique ASAAS customers: ${asaasCustomerIds.length}`)

  if (!asaasApiKey) {
    console.log("\n[WARN] ASAAS_API_KEY not available - skipping ASAAS API comparison")
    return
  }

  // Fetch ASAAS payments
  console.log("\nFetching ASAAS payments (this may take a moment)...")
  let asaasPayments = []
  let processedCustomers = 0

  for (const customerId of asaasCustomerIds) {
    const payments = await fetchAsaasPaymentsForCustomer(customerId)
    asaasPayments = [...asaasPayments, ...payments]
    processedCustomers++

    if (processedCustomers % 10 === 0) {
      process.stdout.write(`  Processed ${processedCustomers}/${asaasCustomerIds.length} customers\r`)
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  console.log(`  Fetched ${asaasPayments.length} total payments from ASAAS`)

  // Calculate ASAAS metrics
  const asaasPaidPayments = asaasPayments.filter(p => PAID_ASAAS_STATUSES.includes(p.status))
  const asaasPendingPayments = asaasPayments.filter(p => p.status === "PENDING")
  const asaasOverduePayments = asaasPayments.filter(p => p.status === "OVERDUE")
  const totalAsaasValue = asaasPayments.reduce((sum, p) => sum + (p.value || 0), 0)
  const receivedAsaasValue = asaasPaidPayments.reduce((sum, p) => sum + (p.value || 0), 0)

  console.log("\n--- ASAAS METRICS ---")
  console.log(`Total Payments:     ${asaasPayments.length}`)
  console.log(`  - Paid:           ${asaasPaidPayments.length}`)
  console.log(`  - Pending:        ${asaasPendingPayments.length}`)
  console.log(`  - Overdue:        ${asaasOverduePayments.length}`)
  console.log(`Total Value:        R$ ${totalAsaasValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  console.log(`Received Value:     R$ ${receivedAsaasValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)

  // Detect discrepancies
  const paidCountDiff = asaasPaidPayments.length - paidAgreements.length
  const valuesDiff = Math.abs(receivedAsaasValue - recoveredDebt)

  // Build map of ASAAS payment ID -> AlteaPay agreement
  const asaasIdToAgreement = new Map()
  agreementsWithAsaas.forEach(a => {
    if (a.asaas_payment_id) {
      asaasIdToAgreement.set(a.asaas_payment_id, a)
    }
  })

  // Find status mismatches
  const statusMismatches = []
  for (const payment of asaasPayments) {
    const agreement = asaasIdToAgreement.get(payment.id)
    if (!agreement) continue

    const asaasPaid = PAID_ASAAS_STATUSES.includes(payment.status)
    const alteapayPaid = isPaidStatus(agreement.status, agreement.payment_status, agreement.asaas_status)

    if (asaasPaid !== alteapayPaid) {
      statusMismatches.push({
        asaasPaymentId: payment.id,
        asaasStatus: payment.status,
        alteapayStatus: agreement.payment_status || agreement.status,
      })
    }
  }

  console.log("\n--- DISCREPANCIES ---")
  console.log(`Paid Count Diff:    ${paidCountDiff} (ASAAS: ${asaasPaidPayments.length}, AlteaPay: ${paidAgreements.length})`)
  console.log(`Value Diff:         R$ ${valuesDiff.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
  console.log(`Status Mismatches:  ${statusMismatches.length}`)

  if (statusMismatches.length > 0) {
    console.log("\nStatus Mismatch Details (first 5):")
    statusMismatches.slice(0, 5).forEach(m => {
      console.log(`  - Payment ${m.asaasPaymentId}: ASAAS=${m.asaasStatus}, AlteaPay=${m.alteapayStatus}`)
    })
  }

  // Summary
  const issues = []
  if (paidCountDiff !== 0) issues.push(`Paid count mismatch: ${paidCountDiff}`)
  if (valuesDiff > 1) issues.push(`Value mismatch: R$ ${valuesDiff.toFixed(2)}`)
  if (statusMismatches.length > 0) issues.push(`${statusMismatches.length} status mismatches`)

  console.log("\n--- SUMMARY ---")
  if (issues.length === 0) {
    console.log("✅ RECONCILED - No discrepancies found")
  } else {
    console.log("❌ DISCREPANCIES FOUND:")
    issues.forEach(i => console.log(`   - ${i}`))
  }

  console.log("\n========================================\n")
}

async function main() {
  // Get companies
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name")
    .limit(5)

  if (error) {
    console.error("Error fetching companies:", error.message)
    return
  }

  console.log("Available companies:")
  companies.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} (${c.id})`))

  // Use first company for test
  if (companies.length > 0) {
    const testCompanyId = process.argv[2] || companies[0].id
    const testCompany = companies.find(c => c.id === testCompanyId) || companies[0]
    console.log(`\nTesting with: ${testCompany.name}`)
    await runReconciliation(testCompany.id)
  }
}

main().catch(console.error)
