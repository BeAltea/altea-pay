/**
 * Add viewer role to user_role enum
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

async function addViewerRole() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  console.log("Adding 'viewer' role to user_role enum...")

  // Use Supabase Management API or direct PostgreSQL connection
  // Since we can't run DDL via REST API, we'll use the postgres connection

  // Try using the Supabase SQL endpoint (if available)
  const sqlEndpoint = supabaseUrl.replace('.supabase.co', '.supabase.co') + '/rest/v1/'

  // Check current enum values first
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  // Query to check existing enum values
  const { data: enumData, error: enumError } = await supabase
    .from('profiles')
    .select('role')
    .limit(1)

  console.log("Current profile check:", enumData, enumError?.message)

  // The ALTER TYPE command cannot be run via the REST API
  // We need to use the Supabase Dashboard SQL Editor or psql

  console.log("")
  console.log("=".repeat(60))
  console.log("MANUAL STEP REQUIRED")
  console.log("=".repeat(60))
  console.log("")
  console.log("Run this SQL in your Supabase Dashboard SQL Editor:")
  console.log("")
  console.log("  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer';")
  console.log("")
  console.log("Supabase Dashboard: https://supabase.com/dashboard")
  console.log("Go to: SQL Editor > New Query > Paste & Run")
  console.log("")
}

addViewerRole().catch(console.error)
