"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function fetchAllCustomers() {
  const supabase = createAdminClient()

  try {
    const [customersRes, vmaxRes] = await Promise.all([
      supabase.from("customers").select("id, name, document, company_id").order("name"),
      supabase.from("VMAX").select("*"),
    ])

    if (customersRes.error) {
      console.error("[v0] Error fetching customers:", customersRes.error)
      throw customersRes.error
    }
    if (vmaxRes.error) {
      console.error("[v0] Error fetching VMAX:", vmaxRes.error)
      throw vmaxRes.error
    }

    console.log("[v0] VMAX records fetched:", vmaxRes.data?.length || 0)
    console.log("[v0] Customers records fetched:", customersRes.data?.length || 0)

    // Combine customers from both tables
    const allCustomers = [
      ...(customersRes.data || []),
      ...(vmaxRes.data || []).map((v: any) => ({
        id: v.id,
        name: v.Cliente || "Cliente sem nome",
        document: v["CPF/CNPJ"] || v.CPFCNPJ || v.CPF || "",
        company_id: v.id_company,
      })),
    ]

    console.log("[v0] Total customers combined:", allCustomers.length)

    return {
      success: true,
      customers: allCustomers,
    }
  } catch (error: any) {
    console.error("[v0] Error in fetchAllCustomers:", error)
    return {
      success: false,
      error: error.message || "Failed to fetch customers",
      customers: [],
    }
  }
}
