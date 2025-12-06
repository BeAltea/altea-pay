import { NextResponse } from "next/server"
import { processCollectionRulers } from "@/lib/collection-ruler-engine"

export const maxDuration = 60
export const dynamic = "force-dynamic"

/**
 * Cron Job: Processa réguas de cobrança customizáveis automaticamente
 * Roda diariamente às 9h da manhã (configurado no vercel.json)
 */
export async function GET(request: Request) {
  try {
    // Verificar secret do cron para segurança
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("[v0] Cron unauthorized attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Cron Job - Collection Ruler - Starting")

    const result = await processCollectionRulers()

    console.log("[v0] Cron Job - Collection Ruler - Finished", result)

    return NextResponse.json({
      success: true,
      message: "Collection ruler processed successfully",
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[v0] Cron Job - Collection Ruler - Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
