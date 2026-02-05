import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

// Load environment variables from .env file manually
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env")
    const envFile = readFileSync(envPath, "utf-8")
    envFile.split("\n").forEach((line) => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=")
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "")
          process.env[key] = value
        }
      }
    })
  } catch (e) {
    console.error("Could not load .env file")
  }
}

loadEnv()

async function setupEmailRecipients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing environment variables:")
    console.error("- NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "OK" : "MISSING")
    console.error("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "OK" : "MISSING")
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log("=".repeat(50))
  console.log("Setting up company_email_recipients table...")
  console.log("=".repeat(50))

  // Step 1: Create the table using SQL
  console.log("\n1. Creating table...")
  const { error: createError } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS company_email_recipients (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        client_name TEXT,
        client_email TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(company_id, client_email)
      );

      CREATE INDEX IF NOT EXISTS idx_company_email_recipients_company_id
        ON company_email_recipients(company_id);
    `,
  })

  if (createError) {
    // If rpc doesn't exist, try inserting directly (table might already exist)
    console.log("Note: Could not use exec_sql RPC, table may need manual creation")
    console.log("Checking if table exists by querying it...")

    const { error: checkError } = await supabase
      .from("company_email_recipients")
      .select("id")
      .limit(1)

    if (checkError && checkError.code === "42P01") {
      console.error("\nERROR: Table does not exist. Please create it manually in Supabase SQL Editor:")
      console.error(`
CREATE TABLE IF NOT EXISTS company_email_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_name TEXT,
  client_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, client_email)
);

CREATE INDEX IF NOT EXISTS idx_company_email_recipients_company_id
  ON company_email_recipients(company_id);

ALTER TABLE company_email_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to company_email_recipients"
  ON company_email_recipients FOR ALL USING (true) WITH CHECK (true);
      `)
      process.exit(1)
    } else if (checkError) {
      console.error("Error checking table:", checkError.message)
      process.exit(1)
    } else {
      console.log("Table already exists!")
    }
  } else {
    console.log("Table created successfully!")
  }

  // Step 2: Fetch existing companies
  console.log("\n2. Fetching companies...")
  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id, name")
    .order("name")

  if (companiesError) {
    console.error("Error fetching companies:", companiesError.message)
    process.exit(1)
  }

  console.log(`Found ${companies?.length || 0} companies:`)
  companies?.forEach((c, i) => console.log(`   ${i + 1}. ${c.name} (${c.id})`))

  if (!companies || companies.length === 0) {
    console.error("\nNo companies found. Cannot import sample data.")
    process.exit(1)
  }

  // Step 3: Insert sample email recipients for each company
  console.log("\n3. Inserting sample email recipients...")

  const sampleRecipients = [
    { client_name: "João Silva", client_email: "joao.silva@example.com" },
    { client_name: "Maria Santos", client_email: "maria.santos@example.com" },
    { client_name: "Pedro Oliveira", client_email: "pedro.oliveira@example.com" },
    { client_name: "Ana Costa", client_email: "ana.costa@example.com" },
    { client_name: "Carlos Ferreira", client_email: "carlos.ferreira@example.com" },
  ]

  let totalInserted = 0

  for (const company of companies) {
    console.log(`\n   Inserting for ${company.name}...`)

    for (const recipient of sampleRecipients) {
      const { error: insertError } = await supabase
        .from("company_email_recipients")
        .upsert(
          {
            company_id: company.id,
            client_name: recipient.client_name,
            client_email: recipient.client_email,
          },
          { onConflict: "company_id,client_email" }
        )

      if (insertError) {
        console.error(`   Error inserting ${recipient.client_email}:`, insertError.message)
      } else {
        totalInserted++
      }
    }
  }

  console.log(`\n   Total recipients inserted/updated: ${totalInserted}`)

  // Step 4: Verify data
  console.log("\n4. Verifying data...")
  const { data: allRecipients, error: verifyError } = await supabase
    .from("company_email_recipients")
    .select(`
      id,
      client_name,
      client_email,
      companies (name)
    `)
    .order("client_name")

  if (verifyError) {
    console.error("Error verifying data:", verifyError.message)
  } else {
    console.log(`\nTotal recipients in database: ${allRecipients?.length || 0}`)
    console.log("\nSample data:")
    console.log("-".repeat(70))
    console.log("Company                    | Client Name          | Email")
    console.log("-".repeat(70))
    allRecipients?.slice(0, 15).forEach((r: any) => {
      const companyName = (r.companies?.name || "Unknown").padEnd(24).slice(0, 24)
      const clientName = (r.client_name || "N/A").padEnd(20).slice(0, 20)
      console.log(`${companyName} | ${clientName} | ${r.client_email}`)
    })
    if ((allRecipients?.length || 0) > 15) {
      console.log(`... and ${(allRecipients?.length || 0) - 15} more`)
    }
  }

  console.log("\n" + "=".repeat(50))
  console.log("Setup complete!")
  console.log("=".repeat(50))
}

setupEmailRecipients().catch(console.error)
