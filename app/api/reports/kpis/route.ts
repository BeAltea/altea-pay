import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { debts, payments, customers, collectionActions } from "@/lib/db/schema"
import { eq, and, gte, gt, sql } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "30d"

    // Calculate date range based on period
    const now = new Date()
    const startDate = new Date()

    switch (period) {
      case "7d":
        startDate.setDate(now.getDate() - 7)
        break
      case "30d":
        startDate.setDate(now.getDate() - 30)
        break
      case "90d":
        startDate.setDate(now.getDate() - 90)
        break
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Get total debt amount
    const totalDebtData = await db
      .select({ amount: debts.amount })
      .from(debts)
      .where(and(eq(debts.companyId, user.companyId!), eq(debts.status, "pending")))

    const totalDebt = totalDebtData?.reduce((sum, debt) => sum + Number(debt.amount), 0) || 0

    // Get recovered amount (paid debts)
    const recoveredData = await db
      .select({ amount: payments.amount })
      .from(payments)
      .where(
        and(
          eq(payments.companyId, user.companyId!),
          gte(payments.paidAt, startDate)
        )
      )

    const recoveredAmount = recoveredData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0

    // Get customer counts
    const customersData = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.companyId, user.companyId!))

    const activeCustomers = customersData?.length || 0

    // Get overdue customers (debts past due date)
    const overdueData = await db
      .select({ customerId: debts.customerId })
      .from(debts)
      .where(
        and(
          eq(debts.companyId, user.companyId!),
          gt(sql`CURRENT_DATE - ${debts.dueDate}::date`, 0)
        )
      )

    const overdueCustomers = new Set(overdueData?.map((d) => d.customerId)).size || 0

    // Get collection actions count
    const actionsData = await db
      .select({ status: collectionActions.status })
      .from(collectionActions)
      .where(
        and(
          eq(collectionActions.companyId, user.companyId!),
          gte(collectionActions.createdAt, startDate)
        )
      )

    const totalActions = actionsData?.length || 0
    const successfulActions =
      actionsData?.filter((a) => a.status === "delivered" || a.status === "responded").length || 0

    // Calculate metrics
    const recoveryRate = totalDebt > 0 ? (recoveredAmount / totalDebt) * 100 : 0
    const averageRecoveryTime = 18.5 // Mock value - would need more complex calculation

    const kpis = {
      totalDebt,
      recoveredAmount,
      recoveryRate: Number(recoveryRate.toFixed(1)),
      activeCustomers,
      overdueCustomers,
      averageRecoveryTime,
      totalActions,
      successfulActions,
    }

    return NextResponse.json({ kpis })
  } catch (error) {
    console.error("Error in KPIs API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
