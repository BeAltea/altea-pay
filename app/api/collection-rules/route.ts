import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { collectionRules } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch collection rules for the user's company
    const rules = await db
      .select()
      .from(collectionRules)
      .where(eq(collectionRules.companyId, user.companyId!))
      .orderBy(desc(collectionRules.createdAt))

    // Transform rules to match frontend interface
    const transformedRules = rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      isActive: rule.isActive,
      steps: rule.conditions || [], // conditions column contains the steps array
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }))

    return NextResponse.json({ rules: transformedRules })
  } catch (error) {
    console.error("Error in collection rules API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, steps } = body

    // Validate required fields
    if (!name || !steps || !Array.isArray(steps)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Insert new collection rule
    const [rule] = await db
      .insert(collectionRules)
      .values({
        companyId: user.companyId!,
        name,
        description: description || "",
        isActive: true,
        conditions: steps,
      })
      .returning()

    // Transform rule to match frontend interface
    const transformedRule = {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      isActive: rule.isActive,
      steps: rule.conditions || [],
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }

    return NextResponse.json({ rule: transformedRule }, { status: 201 })
  } catch (error) {
    console.error("Error in collection rules POST API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
