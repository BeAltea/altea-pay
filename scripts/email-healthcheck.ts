/**
 * Email Health Check Script
 * Validates all client emails in the VMAX table
 *
 * Run with: npx tsx scripts/email-healthcheck.ts
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

// Email validation regex (RFC 5322 compliant, simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

interface EmailIssue {
  id: string
  name: string
  email: string | null
  issue: string
  company?: string
}

async function runHealthCheck() {
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
  console.log("EMAIL HEALTH CHECK")
  console.log("=".repeat(60))
  console.log("")

  // Get all companies
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .order("name")

  if (!companies || companies.length === 0) {
    console.log("No companies found")
    return
  }

  const allIssues: EmailIssue[] = []
  let totalRecords = 0
  let totalWithEmail = 0
  let totalValid = 0
  let totalInvalid = 0
  let totalMissing = 0

  for (const company of companies) {
    console.log(`\nChecking: ${company.name}`)
    console.log("-".repeat(40))

    // Fetch all VMAX records for this company
    let vmaxRecords: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from("VMAX")
        .select("id, Cliente, Email, \"CPF/CNPJ\"")
        .eq("id_company", company.id)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) {
        console.error(`  Error fetching VMAX: ${error.message}`)
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

    const companyStats = {
      total: vmaxRecords.length,
      withEmail: 0,
      valid: 0,
      invalid: 0,
      missing: 0
    }

    for (const record of vmaxRecords) {
      totalRecords++
      const email = record.Email?.trim()

      if (!email) {
        companyStats.missing++
        totalMissing++
        continue
      }

      companyStats.withEmail++
      totalWithEmail++

      // Validate email format
      if (!EMAIL_REGEX.test(email)) {
        companyStats.invalid++
        totalInvalid++
        allIssues.push({
          id: record.id,
          name: record.Cliente || "N/A",
          email: email,
          issue: "Invalid format",
          company: company.name
        })
        continue
      }

      // Check for common issues
      const issues: string[] = []

      // Check for spaces
      if (email.includes(" ")) {
        issues.push("Contains spaces")
      }

      // Check for multiple @
      if ((email.match(/@/g) || []).length > 1) {
        issues.push("Multiple @ symbols")
      }

      // Check for invalid TLD
      const domain = email.split("@")[1]
      if (domain) {
        const tld = domain.split(".").pop()?.toLowerCase()
        if (!tld || tld.length < 2) {
          issues.push("Invalid TLD")
        }

        // Check for common typos in domains
        const commonTypos: Record<string, string> = {
          "gmial.com": "gmail.com",
          "gmai.com": "gmail.com",
          "gmail.com.br": "gmail.com",
          "hotmai.com": "hotmail.com",
          "hotmal.com": "hotmail.com",
          "hotmial.com": "hotmail.com",
          "outloo.com": "outlook.com",
          "outlok.com": "outlook.com",
          "yaho.com": "yahoo.com",
          "yahooo.com": "yahoo.com",
        }

        if (commonTypos[domain.toLowerCase()]) {
          issues.push(`Possible typo: ${domain} → ${commonTypos[domain.toLowerCase()]}`)
        }
      }

      if (issues.length > 0) {
        companyStats.invalid++
        totalInvalid++
        allIssues.push({
          id: record.id,
          name: record.Cliente || "N/A",
          email: email,
          issue: issues.join("; "),
          company: company.name
        })
      } else {
        companyStats.valid++
        totalValid++
      }
    }

    console.log(`  Total records: ${companyStats.total}`)
    console.log(`  With email: ${companyStats.withEmail}`)
    console.log(`  Valid: ${companyStats.valid}`)
    console.log(`  Invalid: ${companyStats.invalid}`)
    console.log(`  Missing email: ${companyStats.missing}`)
  }

  // Summary
  console.log("")
  console.log("=".repeat(60))
  console.log("SUMMARY")
  console.log("=".repeat(60))
  console.log(`Total records: ${totalRecords}`)
  console.log(`With email: ${totalWithEmail} (${((totalWithEmail / totalRecords) * 100).toFixed(1)}%)`)
  console.log(`Valid emails: ${totalValid} (${((totalValid / totalWithEmail) * 100).toFixed(1)}% of emails)`)
  console.log(`Invalid emails: ${totalInvalid} (${((totalInvalid / totalWithEmail) * 100).toFixed(1)}% of emails)`)
  console.log(`Missing emails: ${totalMissing} (${((totalMissing / totalRecords) * 100).toFixed(1)}%)`)

  if (allIssues.length > 0) {
    console.log("")
    console.log("=".repeat(60))
    console.log(`ISSUES FOUND (${allIssues.length})`)
    console.log("=".repeat(60))

    // Group by issue type
    const issuesByType: Record<string, EmailIssue[]> = {}
    for (const issue of allIssues) {
      if (!issuesByType[issue.issue]) {
        issuesByType[issue.issue] = []
      }
      issuesByType[issue.issue].push(issue)
    }

    for (const [issueType, issues] of Object.entries(issuesByType)) {
      console.log(`\n${issueType}: ${issues.length}`)
      // Show first 5 examples
      for (const issue of issues.slice(0, 5)) {
        console.log(`  - ${issue.name}: ${issue.email} (${issue.company})`)
      }
      if (issues.length > 5) {
        console.log(`  ... and ${issues.length - 5} more`)
      }
    }
  } else {
    console.log("")
    console.log("✓ All emails are valid!")
  }
}

runHealthCheck().catch(console.error)
