"use server"

import { db } from "@/lib/db"
import { customers, vmax } from "@/lib/db/schema"
import { asc } from "drizzle-orm"

export async function fetchAllCustomers() {
  console.log("[v0] Iniciando fetchAllCustomers...")

  try {
    console.log("[v0] DB client ready")

    // Buscar clientes da tabela customers
    const customersData = await db
      .select({
        id: customers.id,
        name: customers.name,
        document: customers.document,
        companyId: customers.companyId,
      })
      .from(customers)
      .orderBy(asc(customers.name))

    console.log("[v0] Customers records fetched:", customersData.length)

    // Buscar TODOS os registros VMAX
    const vmaxData = await db
      .select({
        id: vmax.id,
        cliente: vmax.cliente,
        idCompany: vmax.idCompany,
        cpfCnpj: vmax.cpfCnpj,
      })
      .from(vmax)

    console.log("[v0] VMAX records fetched:", vmaxData.length)

    const vmaxCustomers = vmaxData.map((v) => ({
      id: v.id,
      name: v.cliente || "Cliente sem nome",
      document: v.cpfCnpj || "",
      company_id: v.idCompany,
      source: "VMAX",
    }))

    const allCustomers = [
      ...customersData.map((c) => ({
        id: c.id,
        name: c.name,
        document: c.document,
        company_id: c.companyId,
        source: "customers",
      })),
      ...vmaxCustomers,
    ]

    console.log("[v0] Total customers combined:", allCustomers.length)
    console.log("[v0] Breakdown - customers:", customersData.length, "VMAX:", vmaxCustomers.length)

    return {
      success: true,
      customers: allCustomers,
    }
  } catch (error: any) {
    console.error("[v0] FATAL ERROR in fetchAllCustomers:", error)
    console.error("[v0] Error stack:", error.stack)
    return {
      success: false,
      error: error.message || "Failed to fetch customers",
      customers: [],
    }
  }
}
