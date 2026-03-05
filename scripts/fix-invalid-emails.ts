/**
 * Fix Invalid Emails Script
 * Corrects common email typos in the VMAX table
 *
 * Run with: npx tsx scripts/fix-invalid-emails.ts
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

// Domain corrections
const DOMAIN_FIXES: Record<string, string> = {
  "gmail.com.br": "gmail.com",
  "gmai.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmil.com": "gmail.com",
  "hotmai.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "outloo.com": "outlook.com",
  "outlok.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
}

function fixEmail(email: string): { fixed: string; changes: string[] } | null {
  if (!email) return null

  let fixed = email.trim()
  const changes: string[] = []

  // Fix double dots
  if (fixed.includes("..")) {
    fixed = fixed.replace(/\.{2,}/g, ".")
    changes.push("Removed double dots")
  }

  // Fix domain typos
  const atIndex = fixed.indexOf("@")
  if (atIndex > 0) {
    const localPart = fixed.substring(0, atIndex)
    const domain = fixed.substring(atIndex + 1).toLowerCase()

    if (DOMAIN_FIXES[domain]) {
      fixed = `${localPart}@${DOMAIN_FIXES[domain]}`
      changes.push(`Domain: ${domain} → ${DOMAIN_FIXES[domain]}`)
    }
  }

  if (changes.length > 0) {
    return { fixed, changes }
  }
  return null
}

async function fixInvalidEmails() {
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
  console.log("FIX INVALID EMAILS")
  console.log("=".repeat(60))
  console.log("")

  // Fetch all VMAX records with emails
  let vmaxRecords: any[] = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  console.log("Fetching VMAX records...")

  while (hasMore) {
    const { data, error } = await supabase
      .from("VMAX")
      .select("id, Cliente, Email")
      .not("Email", "is", null)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error(`Error fetching VMAX: ${error.message}`)
      break
    }

    if (data && data.length > 0) {
      vmaxRecords = [...vmaxRecords, ...data]
      page++
      hasMore = data.length === pageSize
    } else {
      hasMore = false
    }
  }

  console.log(`Found ${vmaxRecords.length} records with emails`)
  console.log("")

  // Find and fix invalid emails
  const fixes: Array<{
    id: string
    name: string
    oldEmail: string
    newEmail: string
    changes: string[]
  }> = []

  for (const record of vmaxRecords) {
    const email = record.Email?.trim()
    if (!email) continue

    const result = fixEmail(email)
    if (result) {
      fixes.push({
        id: record.id,
        name: record.Cliente || "N/A",
        oldEmail: email,
        newEmail: result.fixed,
        changes: result.changes
      })
    }
  }

  if (fixes.length === 0) {
    console.log("✓ No emails need fixing!")
    return
  }

  console.log(`Found ${fixes.length} emails to fix:`)
  console.log("-".repeat(60))

  for (const fix of fixes) {
    console.log(`${fix.name}`)
    console.log(`  Old: ${fix.oldEmail}`)
    console.log(`  New: ${fix.newEmail}`)
    console.log(`  Fix: ${fix.changes.join(", ")}`)
    console.log("")
  }

  console.log("-".repeat(60))
  console.log(`Applying ${fixes.length} fixes...`)
  console.log("")

  let successCount = 0
  let errorCount = 0

  for (const fix of fixes) {
    const { error } = await supabase
      .from("VMAX")
      .update({ Email: fix.newEmail })
      .eq("id", fix.id)

    if (error) {
      console.error(`✗ Failed to update ${fix.name}: ${error.message}`)
      errorCount++
    } else {
      console.log(`✓ Fixed: ${fix.name} (${fix.oldEmail} → ${fix.newEmail})`)
      successCount++
    }
  }

  console.log("")
  console.log("=".repeat(60))
  console.log("RESULTS")
  console.log("=".repeat(60))
  console.log(`Total fixes: ${fixes.length}`)
  console.log(`Successful: ${successCount}`)
  console.log(`Failed: ${errorCount}`)
}

fixInvalidEmails().catch(console.error)
