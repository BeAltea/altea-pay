/**
 * Script to run the viewer role migration
 *
 * Run with: npx tsx scripts/run-viewer-migration.ts
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

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
  }

  console.log("Running viewer role migration...")
  console.log("")

  // Use the REST API to run the SQL
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseServiceKey,
      "Authorization": `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      query: "ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer'"
    }),
  })

  if (!response.ok) {
    // Try using pg_catalog to check if viewer already exists
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
    })

    console.log("Note: Direct SQL execution may not be available via REST API.")
    console.log("")
    console.log("Please run this SQL in your Supabase SQL Editor:")
    console.log("")
    console.log("  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer';")
    console.log("")
    console.log("Or use the Supabase CLI:")
    console.log("")
    console.log("  supabase db push")
    console.log("")
    process.exit(1)
  }

  console.log("Migration completed successfully!")
}

runMigration().catch(console.error)
