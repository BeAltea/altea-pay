"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function fetchAllCustomers() {
  console.log("[v0] 🔍 Iniciando fetchAllCustomers...")

  try {
    const supabase = createAdminClient()
    console.log("[v0] ✅ Admin client criado")

    const [customersRes, vmaxRes] = await Promise.all([
      supabase.from("customers").select("id, name, document, company_id").order("name"),
      supabase.from("VMAX").select('id, Cliente, id_company, "CPF/CNPJ"'),
    ])

    console.log("[v0] 📊 Customers query status:", customersRes.error ? "ERROR" : "SUCCESS")
    console.log("[v0] 📊 VMAX query status:", vmaxRes.error ? "ERROR" : "SUCCESS")

    if (customersRes.error) {
      console.error("[v0] ❌ Error fetching customers:", customersRes.error)
    }
    if (vmaxRes.error) {
      console.error("[v0] ❌ Error fetching VMAX:", vmaxRes.error)
    }

    const customersData = customersRes.data || []
    const vmaxData = vmaxRes.data || []

    console.log("[v0] 📦 VMAX records fetched:", vmaxData.length)
    console.log("[v0] 📦 Customers records fetched:", customersData.length)

    const vmaxCustomers = vmaxData.map((v: any) => ({
      id: v.id,
      name: v.Cliente || "Cliente sem nome",
      document: v["CPF/CNPJ"] || "",
      company_id: v.id_company,
      source: "VMAX",
    }))

    const allCustomers = [...customersData.map((c: any) => ({ ...c, source: "customers" })), ...vmaxCustomers]

    console.log("[v0] ✅ Total customers combined:", allCustomers.length)
    console.log("[v0] 📊 Breakdown - customers:", customersData.length, "VMAX:", vmaxCustomers.length)

    return {
      success: true,
      customers: allCustomers,
    }
  } catch (error: any) {
    console.error("[v0] ❌ FATAL ERROR in fetchAllCustomers:", error)
    console.error("[v0] Error stack:", error.stack)
    return {
      success: false,
      error: error.message || "Failed to fetch customers",
      customers: [],
    }
  }
}
