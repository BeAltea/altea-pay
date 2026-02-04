"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function fetchAllCustomers() {
  console.log("[v0] Iniciando fetchAllCustomers...")

  try {
    const supabase = createAdminClient()
    console.log("[v0] Admin client criado")

    // Buscar clientes da tabela customers
    const customersRes = await supabase.from("customers").select("id, name, document, company_id").order("name")

    console.log("[v0] Customers query status:", customersRes.error ? "ERROR" : "SUCCESS")

    if (customersRes.error) {
      console.error("[v0] Error fetching customers:", customersRes.error)
    }

    const customersData = customersRes.data || []

    // Buscar TODOS os registros VMAX (paginação para superar limite de 1000)
    let vmaxData: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: vmaxPage, error: vmaxPageError } = await supabase
        .from("VMAX")
        .select('id, Cliente, id_company, "CPF/CNPJ"')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (vmaxPageError) {
        console.error("[v0] Error fetching VMAX page:", vmaxPageError)
        break
      }

      if (vmaxPage && vmaxPage.length > 0) {
        vmaxData = [...vmaxData, ...vmaxPage]
        page++
        hasMore = vmaxPage.length === pageSize
      } else {
        hasMore = false
      }
    }

    console.log("[v0] VMAX records fetched:", vmaxData.length)
    console.log("[v0] Customers records fetched:", customersData.length)

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
