import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
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
    const { data: totalDebtData, error: totalDebtError } = await supabase
      .from("debts")
      .select("current_amount")
      .eq("user_id", user.id)
      .eq("status", "pending")

    if (totalDebtError) {
      console.error("Error fetching total debt:", totalDebtError)
      return NextResponse.json({ error: "Failed to fetch debt data" }, { status: 500 })
    }

    const totalDebt = totalDebtData?.reduce((sum, debt) => sum + Number(debt.current_amount), 0) || 0

    // Get recovered amount (paid debts)
    const { data: recoveredData, error: recoveredError } = await supabase
      .from("payments")
      .select("amount")
      .eq("user_id", user.id)
      .gte("payment_date", startDate.toISOString().split("T")[0])

    if (recoveredError) {
      console.error("Error fetching recovered amount:", recoveredError)
      return NextResponse.json({ error: "Failed to fetch payment data" }, { status: 500 })
    }

    const recoveredAmount = recoveredData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0

    // Get customer counts
    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", user.id)

    if (customersError) {
      console.error("Error fetching customers:", customersError)
      return NextResponse.json({ error: "Failed to fetch customer data" }, { status: 500 })
    }

    const activeCustomers = customersData?.length || 0

    // Get overdue customers (debts with days_overdue > 0)
    const { data: overdueData, error: overdueError } = await supabase
      .from("debts")
      .select("customer_id")
      .eq("user_id", user.id)
      .gt("days_overdue", 0)

    if (overdueError) {
      console.error("Error fetching overdue data:", overdueError)
      return NextResponse.json({ error: "Failed to fetch overdue data" }, { status: 500 })
    }

    const overdueCustomers = new Set(overdueData?.map((d) => d.customer_id)).size || 0

    // Get collection actions count
    const { data: actionsData, error: actionsError } = await supabase
      .from("collection_actions")
      .select("status")
      .eq("user_id", user.id)
      .gte("created_at", startDate.toISOString())

    if (actionsError) {
      console.error("Error fetching actions:", actionsError)
      return NextResponse.json({ error: "Failed to fetch actions data" }, { status: 500 })
    }

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
