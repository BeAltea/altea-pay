import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { debts } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"
import { ClassificationEngine, createClassificationCriteria } from "@/lib/classification-engine"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { debtIds } = body

    // Get debts to classify
    let debtResults
    if (debtIds && debtIds.length > 0) {
      debtResults = await db
        .select()
        .from(debts)
        .where(inArray(debts.id, debtIds))
    } else {
      debtResults = await db
        .select()
        .from(debts)
    }

    if (!debtResults || debtResults.length === 0) {
      return NextResponse.json({ message: "No debts found to classify" })
    }

    // Initialize classification engine
    const classificationEngine = new ClassificationEngine()

    // Classify each debt
    const classifications = []
    for (const debt of debtResults) {
      const daysOverdue = 0 // Would need to compute from dueDate
      const criteria = createClassificationCriteria({
        daysOverdue: daysOverdue,
        currentAmount: Number(debt.amount),
        // In a real implementation, you would fetch customer history here
        customerHistory: {
          previousPayments: 0,
          averageDelayDays: 0,
          totalDebts: 1,
          paymentBehavior: "average" as const,
        },
      })

      const result = classificationEngine.classify(criteria)
      classifications.push({
        debtId: debt.id,
        classification: result.classification,
        score: result.score,
        appliedRule: result.appliedRule,
      })

      // Update debt classification in database
      await db.update(debts).set({ classification: result.classification }).where(eq(debts.id, debt.id))
    }

    // Get classification stats
    const criteriaList = debtResults.map((debt) =>
      createClassificationCriteria({
        daysOverdue: 0,
        currentAmount: Number(debt.amount),
      }),
    )
    const stats = classificationEngine.getClassificationStats(criteriaList)

    return NextResponse.json({
      success: true,
      message: `${classifications.length} debts classified successfully`,
      classifications,
      stats,
    })
  } catch (error) {
    console.error("Classification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get classification statistics
    const debtResults = await db
      .select({
        classification: debts.classification,
        amount: debts.amount,
      })
      .from(debts)

    const stats = {
      total: debtResults.length,
      low: debtResults.filter((d) => d.classification === "low").length,
      medium: debtResults.filter((d) => d.classification === "medium").length,
      high: debtResults.filter((d) => d.classification === "high").length,
      critical: debtResults.filter((d) => d.classification === "critical").length,
      totalAmount: debtResults.reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0),
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Classification stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
