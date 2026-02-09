/**
 * Script to remove test client records from the database
 *
 * Records to remove:
 * - Fabio Moura Barros
 * - Fabio Barros
 * - Pedro Moura Barros
 * - Rodrigo Barbieri
 *
 * Usage: npx tsx scripts/remove-test-clients.ts
 */

import * as dotenv from "dotenv"
dotenv.config()

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const testNames = [
  "Fabio Moura Barros",
  "Fabio Barros",
  "Pedro Moura Barros",
  "Rodrigo Barbieri"
]

async function main() {
  console.log("=== Starting test client removal ===\n")

  // 1. Find records in VMAX table
  console.log("1. Searching VMAX table...")
  const { data: vmaxRecords, error: vmaxError } = await supabase
    .from("VMAX")
    .select("id, Cliente, \"CPF/CNPJ\"")
    .or(testNames.map(name => `Cliente.ilike.%${name}%`).join(","))

  if (vmaxError) {
    console.error("Error searching VMAX:", vmaxError)
  } else {
    console.log(`   Found ${vmaxRecords?.length || 0} records in VMAX`)
    vmaxRecords?.forEach(r => console.log(`   - ${r.Cliente} (${r["CPF/CNPJ"]})`))
  }

  // 2. Find records in customers table
  console.log("\n2. Searching customers table...")
  const { data: customerRecords, error: customerError } = await supabase
    .from("customers")
    .select("id, name, document")
    .or(testNames.map(name => `name.ilike.%${name}%`).join(","))

  if (customerError) {
    console.error("Error searching customers:", customerError)
  } else {
    console.log(`   Found ${customerRecords?.length || 0} records in customers`)
    customerRecords?.forEach(r => console.log(`   - ${r.name} (${r.document})`))
  }

  // 3. Find records in credit_profiles table
  console.log("\n3. Searching credit_profiles table...")
  const { data: creditRecords, error: creditError } = await supabase
    .from("credit_profiles")
    .select("id, name, cpf")
    .or(testNames.map(name => `name.ilike.%${name}%`).join(","))

  if (creditError) {
    console.error("Error searching credit_profiles:", creditError)
  } else {
    console.log(`   Found ${creditRecords?.length || 0} records in credit_profiles`)
    creditRecords?.forEach(r => console.log(`   - ${r.name} (${r.cpf})`))
  }

  // 4. Find records in profiles table
  console.log("\n4. Searching profiles table...")
  const { data: profileRecords, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .or(testNames.map(name => `full_name.ilike.%${name}%`).join(","))

  if (profileError) {
    console.error("Error searching profiles:", profileError)
  } else {
    console.log(`   Found ${profileRecords?.length || 0} records in profiles`)
    profileRecords?.forEach(r => console.log(`   - ${r.full_name} (${r.email}) - ${r.role}`))
  }

  const totalRecords =
    (vmaxRecords?.length || 0) +
    (customerRecords?.length || 0) +
    (creditRecords?.length || 0) +
    (profileRecords?.length || 0)

  if (totalRecords === 0) {
    console.log("\n=== No test records found. Nothing to delete. ===")
    return
  }

  console.log("\n=== Starting deletion... ===\n")

  // Get VMAX IDs for cascading deletes
  const vmaxIds = vmaxRecords?.map(r => r.id) || []
  const customerIds = customerRecords?.map(r => r.id) || []

  // Delete from credit_profiles
  if (creditRecords && creditRecords.length > 0) {
    const creditIds = creditRecords.map(r => r.id)
    const { error } = await supabase
      .from("credit_profiles")
      .delete()
      .in("id", creditIds)
    console.log(`5. Deleted ${creditRecords.length} records from credit_profiles ${error ? `(Error: ${error.message})` : "✓"}`)
  }

  // Delete from collection_actions (linked to VMAX customer_id)
  if (vmaxIds.length > 0) {
    const { error, count } = await supabase
      .from("collection_actions")
      .delete()
      .in("customer_id", vmaxIds)
    console.log(`6. Deleted collection_actions for VMAX customers ${error ? `(Error: ${error.message})` : "✓"}`)
  }

  // Delete from collection_rule_executions
  if (vmaxIds.length > 0) {
    const { error } = await supabase
      .from("collection_rule_executions")
      .delete()
      .in("customer_id", vmaxIds)
    console.log(`7. Deleted collection_rule_executions for VMAX customers ${error ? `(Error: ${error.message})` : "✓"}`)
  }

  // Delete from agreements (linked to VMAX customer_id)
  if (vmaxIds.length > 0) {
    const { error } = await supabase
      .from("agreements")
      .delete()
      .in("customer_id", vmaxIds)
    console.log(`8. Deleted agreements for VMAX customers ${error ? `(Error: ${error.message})` : "✓"}`)
  }

  // Delete from debts (linked to customers table)
  if (customerIds.length > 0) {
    const { error } = await supabase
      .from("debts")
      .delete()
      .in("customer_id", customerIds)
    console.log(`9. Deleted debts for customers ${error ? `(Error: ${error.message})` : "✓"}`)
  }

  // Delete from customers table
  if (customerIds.length > 0) {
    const { error } = await supabase
      .from("customers")
      .delete()
      .in("id", customerIds)
    console.log(`10. Deleted ${customerIds.length} records from customers ${error ? `(Error: ${error.message})` : "✓"}`)
  }

  // Delete from VMAX table
  if (vmaxIds.length > 0) {
    const { error } = await supabase
      .from("VMAX")
      .delete()
      .in("id", vmaxIds)
    console.log(`11. Deleted ${vmaxIds.length} records from VMAX ${error ? `(Error: ${error.message})` : "✓"}`)
  }

  // Handle profiles/auth.users (if any)
  if (profileRecords && profileRecords.length > 0) {
    console.log("\n⚠️  Found matching profiles (auth users):")
    profileRecords.forEach(r => console.log(`   - ${r.full_name} (${r.email}) - role: ${r.role}`))
    console.log("   These need to be deleted via Supabase Dashboard > Authentication > Users")
    console.log("   Or use the Supabase Admin API to delete auth.users")
  }

  console.log("\n=== Deletion complete ===")
  console.log(`Total records processed: ${totalRecords}`)
}

main().catch(console.error)
