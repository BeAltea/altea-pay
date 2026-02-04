import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { eq, sql } from "drizzle-orm"
import { companies, customers, debts, vmax } from "@/lib/db/schema"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch companies
    const companiesData = await db.select().from(companies)

    // Fetch customers
    const customersData = await db.select().from(customers)

    // Fetch VMAX customers
    const vmaxData = await db.select().from(vmax)

    // Fetch debts
    const debtsData = await db.select().from(debts)

    const totalCompanies = companiesData.length
    const totalCustomers = customersData.length + vmaxData.length
    const totalAmount = debtsData.reduce((sum, debt) => sum + Number(debt.amount || 0), 0)
    const paidDebts = debtsData.filter((d) => d.status === "paid")
    const totalRecovered = paidDebts.reduce((sum, debt) => sum + Number(debt.amount || 0), 0)

    // Build companies report
    const companiesReport = companiesData.map((company) => {
      const companyCustomers = customersData.filter((c) => c.companyId === company.id)
      const companyDebts = debtsData.filter((d) => {
        const customer = customersData.find((c) => c.id === d.customerId)
        return customer?.companyId === company.id
      })

      const companyAmount = companyDebts.reduce((sum, debt) => sum + Number(debt.amount || 0), 0)
      const companyPaid = companyDebts.filter((d) => d.status === "paid")
      const companyRecovered = companyPaid.reduce((sum, debt) => sum + Number(debt.amount || 0), 0)
      const recoveryRate = companyAmount > 0 ? (companyRecovered / companyAmount) * 100 : 0

      return {
        id: company.id,
        name: company.name,
        totalCustomers: companyCustomers.length,
        totalDebts: companyDebts.length,
        totalAmount: companyAmount,
        recoveredAmount: companyRecovered,
        recoveryRate: recoveryRate,
        overdueDebts: companyDebts.filter((d) => d.status === "overdue").length,
        monthlyGrowth: 0,
      }
    })

    const data = {
      totalCompanies,
      totalCustomers,
      totalAmount,
      totalRecovered,
      companiesReport,
      totalDebts: debtsData.length,
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] Error fetching reports:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
