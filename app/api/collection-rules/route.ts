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

    // Fetch collection rules for the user
    const { data: rules, error } = await supabase
      .from("collection_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching collection rules:", error)
      return NextResponse.json({ error: "Failed to fetch collection rules" }, { status: 500 })
    }

    // Transform rules to match frontend interface
    const transformedRules = rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      isActive: rule.is_active,
      steps: rule.rules || [], // rules column contains the steps array
      createdAt: rule.created_at,
      updatedAt: rule.updated_at,
    }))

    return NextResponse.json({ rules: transformedRules })
  } catch (error) {
    console.error("Error in collection rules API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, steps } = body

    // Validate required fields
    if (!name || !steps || !Array.isArray(steps)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Insert new collection rule
    const { data: rule, error } = await supabase
      .from("collection_rules")
      .insert({
        user_id: user.id,
        name,
        description: description || "",
        is_active: true,
        rules: steps,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating collection rule:", error)
      return NextResponse.json({ error: "Failed to create collection rule" }, { status: 500 })
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

    return NextResponse.json({ rule: transformedRule }, { status: 201 })
  } catch (error) {
    console.error("Error in collection rules POST API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
