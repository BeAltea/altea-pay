/**
 * Run the viewer role migration using pg
 */

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
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL

  if (!connectionString) {
    console.error("Missing POSTGRES_URL or POSTGRES_URL_NON_POOLING")
    process.exit(1)
  }

  // Dynamic import pg
  const { Client } = await import("pg")

  // Append sslmode if not present
  const url = new URL(connectionString)
  url.searchParams.set('sslmode', 'require')

  const client = new Client({
    connectionString: url.toString(),
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log("Connecting to database...")
    await client.connect()
    console.log("Connected!")

    console.log("Adding 'viewer' role to user_role enum...")
    await client.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer'")
    console.log("Migration successful!")

    // Verify
    const result = await client.query("SELECT unnest(enum_range(NULL::user_role)) as role")
    console.log("Current roles:", result.rows.map(r => r.role).join(", "))

  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log("'viewer' role already exists in enum")
    } else {
      console.error("Error:", error.message)
      process.exit(1)
    }
  } finally {
    await client.end()
  }
}

runMigration()
