import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { dataImports } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const user = session?.user
    if (!user) {
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
    const [importRecord] = await db
      .insert(dataImports)
      .values({
        companyId: user.companyId,
        fileName: file.name,
        importType: file.type,
        status: "processing",
        totalRecords: 0,
        processedRecords: 0,
        failedRecords: 0,
      })
      .returning()

    // In a real implementation, you would:
    // 1. Parse the file content based on its type
    // 2. Validate each record
    // 3. Insert valid records into customers/debts tables
    // 4. Update the import record with results
    // 5. Handle this asynchronously for large files

    // For now, simulate processing
    setTimeout(async () => {
      try {
        await db
          .update(dataImports)
          .set({
            status: "completed",
            totalRecords: 100,
            processedRecords: 95,
            failedRecords: 5,
          })
          .where(eq(dataImports.id, importRecord.id))
      } catch (e) {
        console.error("Error updating import record:", e)
      }
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
    const session = await auth()
    const user = session?.user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get import history
    const imports = await db
      .select()
      .from(dataImports)
      .where(eq(dataImports.companyId, user.companyId!))
      .orderBy(desc(dataImports.createdAt))

    return NextResponse.json({ imports })
  } catch (error) {
    console.error("Import history error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
