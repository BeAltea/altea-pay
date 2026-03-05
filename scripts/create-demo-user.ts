/**
 * Script to create a demo user with viewer (read-only) access
 *
 * Run with: npx tsx scripts/create-demo-user.ts
 *
 * The demo user:
 * - Has role 'viewer' (read-only access to super-admin)
 * - Is linked to VMAX company
 * - Cannot perform any actions (buttons hidden via ReadOnlyGuard)
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { join } from "path"

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envPath = join(process.cwd(), ".env.local")
    const envContent = readFileSync(envPath, "utf-8")
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIndex = trimmed.indexOf("=")
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex)
        const value = trimmed.substring(eqIndex + 1)
        process.env[key] = value
      }
    }
  } catch (e) {
    console.error("Failed to load .env.local:", e)
  }
}

loadEnvFile()

const DEMO_EMAIL = "demo@alteapay.com.br"
const DEMO_PASSWORD = "AlteaDemo@2025"
const DEMO_NAME = "Usuario Demo"

async function createDemoUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  console.log("=".repeat(60))
  console.log("Creating Demo User")
  console.log("=".repeat(60))
  console.log("")

  // 1. Check if user already exists
  console.log("1. Checking if user already exists...")
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === DEMO_EMAIL)

  if (existingUser) {
    console.log(`   User ${DEMO_EMAIL} already exists with ID: ${existingUser.id}`)

    // Update profile to ensure it has viewer role
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: "viewer" })
      .eq("id", existingUser.id)

    if (updateError) {
      console.error("   Error updating existing profile:", updateError.message)
    } else {
      console.log("   Updated existing profile to viewer role")
    }

    console.log("")
    console.log("Demo user credentials:")
    console.log(`  Email: ${DEMO_EMAIL}`)
    console.log(`  Password: ${DEMO_PASSWORD}`)
    console.log(`  Role: viewer (read-only)`)
    return
  }

  // 2. Find VMAX company
  console.log("2. Finding VMAX company...")
  const { data: vmaxCompany, error: companyError } = await supabase
    .from("companies")
    .select("id, name")
    .ilike("name", "%vmax%")
    .single()

  if (companyError || !vmaxCompany) {
    console.error("   VMAX company not found:", companyError?.message)
    console.log("   Proceeding without company association...")
  } else {
    console.log(`   Found: ${vmaxCompany.name} (${vmaxCompany.id})`)
  }

  // 3. Create auth user
  console.log("3. Creating auth user...")
  const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: DEMO_NAME,
    },
  })

  if (authError) {
    console.error("   Error creating auth user:", authError.message)
    process.exit(1)
  }

  console.log(`   Created auth user: ${newUser.user.id}`)

  // 4. Create profile
  console.log("4. Creating profile...")
  const { error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: newUser.user.id,
      email: DEMO_EMAIL,
      full_name: DEMO_NAME,
      role: "viewer",
      company_id: vmaxCompany?.id || null,
    })

  if (profileError) {
    console.error("   Error creating profile:", profileError.message)
    // Try to clean up auth user
    console.log("   Cleaning up auth user...")
    await supabase.auth.admin.deleteUser(newUser.user.id)
    console.log("   Auth user cleaned up.")
    console.log("")
    console.log("If you see 'invalid input value for enum user_role: viewer',")
    console.log("you need to run this SQL in Supabase SQL Editor first:")
    console.log("")
    console.log("  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer';")
    console.log("")
    console.log("Then re-run this script.")
    process.exit(1)
  }

  console.log("   Profile created successfully")

  // 5. Summary
  console.log("")
  console.log("=".repeat(60))
  console.log("Demo User Created Successfully!")
  console.log("=".repeat(60))
  console.log("")
  console.log("Credentials:")
  console.log(`  Email:    ${DEMO_EMAIL}`)
  console.log(`  Password: ${DEMO_PASSWORD}`)
  console.log(`  Role:     viewer (read-only)`)
  console.log(`  Company:  ${vmaxCompany?.name || "None"}`)
  console.log("")
  console.log("The user can:")
  console.log("  - Access the super-admin panel")
  console.log("  - View all data (filtered to VMAX if company is set)")
  console.log("  - Navigate all pages")
  console.log("")
  console.log("The user CANNOT:")
  console.log("  - Send emails or notifications")
  console.log("  - Create, edit, or delete records")
  console.log("  - Trigger any batch operations")
  console.log("  - Access API endpoints that modify data")
  console.log("")
}

createDemoUser().catch(console.error)
