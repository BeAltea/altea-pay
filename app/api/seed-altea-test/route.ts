import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase environment variables")
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Fixed UUIDs for consistent referencing (valid UUID format)
const ALTEA_TEST_COMPANY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const FABIO_CUSTOMER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
const RODRIGO_CUSTOMER_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"
const FABIO_DEBT_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd"
const RODRIGO_DEBT_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"

export async function GET() {
  return await executeSeed()
}

export async function POST() {
  return await executeSeed()
}

async function executeSeed() {
  console.log("=".repeat(60))
  console.log("Starting Altea-Test seed...")
  console.log("=".repeat(60))

  const supabase = getSupabaseAdmin()
  const results: Record<string, any> = {}

  try {
    // Step 1: Create Company
    console.log("\n[Step 1] Creating Altea-Test company...")
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .upsert({
        id: ALTEA_TEST_COMPANY_ID,
        name: "Altea-Test",
        email: "admin@altea-test.com",
        cnpj: "00.000.000/0001-00",
        phone: "(11) 99999-0000",
        address: "Rua de Teste, 123",
        city: "Sao Paulo",
        state: "SP",
        zip_code: "01000-000",
        sector: "Teste",
      }, { onConflict: "id" })
      .select()
      .single()

    if (companyError) {
      console.error("Error creating company:", companyError)
      throw companyError
    }
    console.log("Company created:", company?.name, company?.id)
    results.company = company

    // Step 1.5: Clean up duplicate customers (those with same document but different IDs)
    console.log("\n[Step 1.5] Cleaning up duplicate customers...")
    const { error: cleanupFabioError } = await supabase
      .from("customers")
      .delete()
      .eq("document", "41719010811")
      .neq("id", FABIO_CUSTOMER_ID)
    if (cleanupFabioError) {
      console.log("Note: Could not clean Fabio duplicates:", cleanupFabioError.message)
    } else {
      console.log("Cleaned up Fabio duplicates")
    }

    const { error: cleanupRodrigoError } = await supabase
      .from("customers")
      .delete()
      .eq("document", "27751042826")
      .neq("id", RODRIGO_CUSTOMER_ID)
    if (cleanupRodrigoError) {
      console.log("Note: Could not clean Rodrigo duplicates:", cleanupRodrigoError.message)
    } else {
      console.log("Cleaned up Rodrigo duplicates")
    }

    // Step 2: Create Customer - Fabio
    console.log("\n[Step 2] Creating customer Fabio Moura Barros...")
    const { data: fabio, error: fabioError } = await supabase
      .from("customers")
      .upsert({
        id: FABIO_CUSTOMER_ID,
        company_id: ALTEA_TEST_COMPANY_ID,
        name: "Fabio Moura Barros",
        email: "fabiofmb71@gmail.com",
        phone: "(11) 97460-2123",
        document: "41719010811",
        document_type: "CPF",
        city: "Sao Paulo",
        state: "SP",
        source_system: "manual",
      }, { onConflict: "id" })
      .select()
      .single()

    if (fabioError) {
      console.error("Error creating Fabio:", fabioError)
      throw fabioError
    }
    console.log("Customer created:", fabio?.name, fabio?.id)
    results.fabio = fabio

    // Step 3: Create Customer - Rodrigo
    console.log("\n[Step 3] Creating customer Rodrigo Moura Barbieri...")
    const { data: rodrigo, error: rodrigoError } = await supabase
      .from("customers")
      .upsert({
        id: RODRIGO_CUSTOMER_ID,
        company_id: ALTEA_TEST_COMPANY_ID,
        name: "Rodrigo Moura Barbieri",
        email: "rodrigo@bealtea.com",
        phone: "(11) 99999-2222",
        document: "27751042826",
        document_type: "CPF",
        city: "Sao Paulo",
        state: "SP",
        source_system: "manual",
      }, { onConflict: "id" })
      .select()
      .single()

    if (rodrigoError) {
      console.error("Error creating Rodrigo:", rodrigoError)
      throw rodrigoError
    }
    console.log("Customer created:", rodrigo?.name, rodrigo?.id)
    results.rodrigo = rodrigo

    // Step 4: Create Debt for Fabio
    console.log("\n[Step 4] Creating R$ 5.00 debt for Fabio...")
    const { data: fabioDebt, error: fabioDebtError } = await supabase
      .from("debts")
      .upsert({
        id: FABIO_DEBT_ID,
        customer_id: FABIO_CUSTOMER_ID,
        company_id: ALTEA_TEST_COMPANY_ID,
        amount: 5.00,
        due_date: "2025-02-01",
        description: "Divida de teste - ASAAS sync",
        status: "pending",
        classification: "low",
        source_system: "manual",
      }, { onConflict: "id" })
      .select()
      .single()

    if (fabioDebtError) {
      console.error("Error creating Fabio debt:", fabioDebtError)
      throw fabioDebtError
    }
    console.log("Debt created for Fabio: R$", fabioDebt?.amount)
    results.fabioDebt = fabioDebt

    // Step 5: Create Debt for Rodrigo
    console.log("\n[Step 5] Creating R$ 5.00 debt for Rodrigo...")
    const { data: rodrigoDebt, error: rodrigoDebtError } = await supabase
      .from("debts")
      .upsert({
        id: RODRIGO_DEBT_ID,
        customer_id: RODRIGO_CUSTOMER_ID,
        company_id: ALTEA_TEST_COMPANY_ID,
        amount: 5.00,
        due_date: "2025-02-01",
        description: "Divida de teste - ASAAS sync",
        status: "pending",
        classification: "low",
        source_system: "manual",
      }, { onConflict: "id" })
      .select()
      .single()

    if (rodrigoDebtError) {
      console.error("Error creating Rodrigo debt:", rodrigoDebtError)
      throw rodrigoDebtError
    }
    console.log("Debt created for Rodrigo: R$", rodrigoDebt?.amount)
    results.rodrigoDebt = rodrigoDebt

    // Step 6: Create VMAX entries for admin dashboard
    console.log("\n[Step 6] Creating VMAX entries...")
    const daysOverdue = Math.floor((Date.now() - new Date("2025-02-01").getTime()) / (1000 * 60 * 60 * 24))

    const { error: fabioVmaxError } = await supabase
      .from("VMAX")
      .upsert({
        id: FABIO_CUSTOMER_ID,
        "Cliente": "Fabio Moura Barros",
        "CPF/CNPJ": "41719010811",
        "Cidade": "Sao Paulo",
        "UF": "SP",
        "Vencido": "5,00",
        "Dias Inad.": daysOverdue,
        "Vecto": "01/02/2025",
        id_company: ALTEA_TEST_COMPANY_ID,
        approval_status: "ACEITA",
      }, { onConflict: "id" })

    if (fabioVmaxError) {
      console.error("Error creating Fabio VMAX:", fabioVmaxError)
      // Don't throw - VMAX might not be required
    } else {
      console.log("VMAX entry created for Fabio")
    }

    const { error: rodrigoVmaxError } = await supabase
      .from("VMAX")
      .upsert({
        id: RODRIGO_CUSTOMER_ID,
        "Cliente": "Rodrigo Moura Barbieri",
        "CPF/CNPJ": "27751042826",
        "Cidade": "Sao Paulo",
        "UF": "SP",
        "Vencido": "5,00",
        "Dias Inad.": daysOverdue,
        "Vecto": "01/02/2025",
        id_company: ALTEA_TEST_COMPANY_ID,
        approval_status: "ACEITA",
      }, { onConflict: "id" })

    if (rodrigoVmaxError) {
      console.error("Error creating Rodrigo VMAX:", rodrigoVmaxError)
    } else {
      console.log("VMAX entry created for Rodrigo")
    }

    // Step 7: Create/Update admin profile
    console.log("\n[Step 7] Creating admin profile...")
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", "admin-test@alteapay.com")
      .single()

    if (existingProfile) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          role: "admin",
          company_id: ALTEA_TEST_COMPANY_ID,
          company_name: "Altea-Test",
          full_name: "Admin Altea Test",
        })
        .eq("email", "admin-test@alteapay.com")

      if (updateError) {
        console.error("Error updating admin profile:", updateError)
      } else {
        console.log("Admin profile updated for admin-test@alteapay.com")
      }
    } else {
      // Try to insert - if it fails, that's ok (profile will be created when user registers)
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: crypto.randomUUID(),
          email: "admin-test@alteapay.com",
          full_name: "Admin Altea Test",
          role: "admin",
          company_id: ALTEA_TEST_COMPANY_ID,
          company_name: "Altea-Test",
          phone: "(11) 99999-9999",
        })

      if (insertError) {
        console.error("Error inserting admin profile:", insertError)
        console.log("Note: User can register with admin-test@alteapay.com and profile will be auto-configured")
      } else {
        console.log("Admin profile created for admin-test@alteapay.com")
      }
    }

    // Step 8: Verify the data
    console.log("\n[Step 8] Verifying created data...")

    const { data: verifyCompany } = await supabase
      .from("companies")
      .select("id, name, status")
      .eq("id", ALTEA_TEST_COMPANY_ID)
      .single()

    const { data: verifyCustomers } = await supabase
      .from("customers")
      .select("id, name, document, email, phone, company_id")
      .eq("company_id", ALTEA_TEST_COMPANY_ID)

    const { data: verifyDebts } = await supabase
      .from("debts")
      .select("id, customer_id, amount, due_date, status")
      .eq("company_id", ALTEA_TEST_COMPANY_ID)

    const { data: verifyVmax } = await supabase
      .from("VMAX")
      .select('id, "Cliente", "CPF/CNPJ", "Vencido"')
      .eq("id_company", ALTEA_TEST_COMPANY_ID)

    const { data: verifyProfile } = await supabase
      .from("profiles")
      .select("email, role, company_name, company_id")
      .eq("email", "admin-test@alteapay.com")
      .single()

    console.log("\n" + "=".repeat(60))
    console.log("VERIFICATION RESULTS")
    console.log("=".repeat(60))
    console.log("\nCompany:", verifyCompany)
    console.log("\nCustomers:", verifyCustomers)
    console.log("\nDebts:", verifyDebts)
    console.log("\nVMAX entries:", verifyVmax)
    console.log("\nAdmin profile:", verifyProfile)

    return NextResponse.json({
      success: true,
      message: "Altea-Test company created successfully!",
      data: {
        company: verifyCompany,
        customers: verifyCustomers,
        debts: verifyDebts,
        vmax: verifyVmax,
        adminProfile: verifyProfile,
      },
      summary: {
        companyId: ALTEA_TEST_COMPANY_ID,
        companyName: "Altea-Test",
        customersCreated: verifyCustomers?.length || 0,
        debtsCreated: verifyDebts?.length || 0,
        vmaxEntries: verifyVmax?.length || 0,
        totalDebtValue: "R$ 10.00",
        adminEmail: "admin-test@alteapay.com",
        adminPassword: "Gj4gx3h4wUruEdXZ",
      },
    })

  } catch (error: any) {
    console.error("Error in seed:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to seed Altea-Test data",
      details: error?.message || error?.code || JSON.stringify(error) || "Unknown error",
    }, { status: 500 })
  }
}
