import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const body = await request.json()
    const { name, description, steps, isActive } = body

    // Update collection rule
    const { data: rule, error } = await supabase
      .from("collection_rules")
      .update({
        name,
        description: description || "",
        is_active: isActive,
        rules: steps,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("user_id", user.id) // Ensure user can only update their own rules
      .select()
      .single()

    if (error) {
      console.error("Error updating collection rule:", error)
      return NextResponse.json({ error: "Failed to update collection rule" }, { status: 500 })
    }

    if (!rule) {
      return NextResponse.json({ error: "Collection rule not found" }, { status: 404 })
    }

    // Transform rule to match frontend interface
    const transformedRule = {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      isActive: rule.is_active,
      steps: rule.rules || [],
      createdAt: rule.created_at,
      updatedAt: rule.updated_at,
    }

    return NextResponse.json({ rule: transformedRule })
  } catch (error) {
    console.error("Error in collection rules PUT API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Delete collection rule
    const { error } = await supabase.from("collection_rules").delete().eq("id", params.id).eq("user_id", user.id) // Ensure user can only delete their own rules

    if (error) {
      console.error("Error deleting collection rule:", error)
      return NextResponse.json({ error: "Failed to delete collection rule" }, { status: 500 })
    }

    return NextResponse.json({ message: "Collection rule deleted successfully" })
  } catch (error) {
    console.error("Error in collection rules DELETE API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
