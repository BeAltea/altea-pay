import { NextResponse } from "next/server"
import { processCollectionRulers } from "@/lib/collection-ruler-engine"

/**
 * Cron Job: Processa réguas de cobrança automaticamente
 * Roda a cada hora para verificar dívidas que precisam de cobrança
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("[v0] Cron job unauthorized - invalid CRON_SECRET")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[v0] ===== CRON JOB: Collection Rules Processing Started =====")
  console.log("[v0] Timestamp:", new Date().toISOString())

  try {
    const result = await processCollectionRulers()

    console.log("[v0] ===== CRON JOB: Collection Rules Processing Finished =====")
    console.log("[v0] Result:", result)

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      rules: result.rules,
      message: `Processed ${result.processed} collection actions from ${result.rules || 0} active rules`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[v0] ===== CRON JOB: Collection Rules Processing FAILED =====")
    console.error("[v0] Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        processed: 0,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
