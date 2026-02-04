import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { collectionRules } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, steps, isActive } = body

    // Update collection rule
    const [rule] = await db
      .update(collectionRules)
      .set({
        name,
        description: description || "",
        isActive,
        conditions: steps,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(collectionRules.id, params.id),
          eq(collectionRules.companyId, user.companyId!)
        )
      )
      .returning()

    if (!rule) {
      return NextResponse.json({ error: "Collection rule not found" }, { status: 404 })
    }

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

    return NextResponse.json({ rule: transformedRule })
  } catch (error) {
    console.error("Error in collection rules PUT API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete collection rule
    await db
      .delete(collectionRules)
      .where(
        and(
          eq(collectionRules.id, params.id),
          eq(collectionRules.companyId, user.companyId!)
        )
      )

    return NextResponse.json({ message: "Collection rule deleted successfully" })
  } catch (error) {
    console.error("Error in collection rules DELETE API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
