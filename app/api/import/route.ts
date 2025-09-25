import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/json",
      "text/xml",
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from("data_imports")
      .insert({
        user_id: user.id,
        filename: file.name,
        file_type: file.type,
        status: "processing",
        total_records: 0,
        successful_records: 0,
        failed_records: 0,
      })
      .select()
      .single()

    if (importError) {
      console.error("Error creating import record:", importError)
      return NextResponse.json({ error: "Failed to create import record" }, { status: 500 })
    }

    // In a real implementation, you would:
    // 1. Parse the file content based on its type
    // 2. Validate each record
    // 3. Insert valid records into customers/debts tables
    // 4. Update the import record with results
    // 5. Handle this asynchronously for large files

    // For now, simulate processing
    setTimeout(async () => {
      const supabaseUpdate = await createClient()
      await supabaseUpdate
        .from("data_imports")
        .update({
          status: "completed",
          total_records: 100,
          successful_records: 95,
          failed_records: 5,
        })
        .eq("id", importRecord.id)
    }, 3000)

    return NextResponse.json({
      success: true,
      importId: importRecord.id,
      message: "File uploaded successfully and is being processed",
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get import history
    const { data: imports, error } = await supabase
      .from("data_imports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching imports:", error)
      return NextResponse.json({ error: "Failed to fetch imports" }, { status: 500 })
    }

    return NextResponse.json({ imports })
  } catch (error) {
    console.error("Import history error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
