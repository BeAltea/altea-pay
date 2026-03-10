import { createAdminClient, createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // 5 minutes for backfill

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_BASE_URL = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"

interface AsaasPayment {
  id: string
  dueDate: string
  value: number
  status: string
}

async function fetchAsaasPayment(paymentId: string): Promise<AsaasPayment | null> {
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY || "",
      },
    })

    if (!response.ok) {
      console.warn(`[BACKFILL] Failed to fetch payment ${paymentId}: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error: any) {
    console.error(`[BACKFILL] Error fetching payment ${paymentId}:`, error.message)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify super admin
    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
    }

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
    }

    const supabase = createAdminClient()

    // Find all agreements with asaas_payment_id but NULL due_date
    const { data: agreements, error: fetchError } = await supabase
      .from("agreements")
      .select("id, asaas_payment_id, due_date, company_id")
      .not("asaas_payment_id", "is", null)
      .is("due_date", null)

    if (fetchError) {
      console.error("[BACKFILL] Error fetching agreements:", fetchError.message)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!agreements || agreements.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No agreements to backfill",
        processed: 0,
        updated: 0,
        failed: 0,
      })
    }

    console.log(`[BACKFILL] Found ${agreements.length} agreements to process`)

    let updated = 0
    let failed = 0
    const errors: string[] = []

    // Process in batches to respect rate limits
    const BATCH_SIZE = 5
    const BATCH_DELAY_MS = 1000

    for (let i = 0; i < agreements.length; i += BATCH_SIZE) {
      const batch = agreements.slice(i, i + BATCH_SIZE)

      const results = await Promise.allSettled(
        batch.map(async (agreement) => {
          const payment = await fetchAsaasPayment(agreement.asaas_payment_id)

          if (!payment || !payment.dueDate) {
            return { agreementId: agreement.id, success: false, reason: "No dueDate from ASAAS" }
          }

          const { error: updateError } = await supabase
            .from("agreements")
            .update({ due_date: payment.dueDate })
            .eq("id", agreement.id)

          if (updateError) {
            return { agreementId: agreement.id, success: false, reason: updateError.message }
          }

          return { agreementId: agreement.id, success: true, dueDate: payment.dueDate }
        })
      )

      for (const result of results) {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            updated++
          } else {
            failed++
            errors.push(`${result.value.agreementId}: ${result.value.reason}`)
          }
        } else {
          failed++
          errors.push(`Unknown error: ${result.reason}`)
        }
      }

      // Rate limiting delay between batches
      if (i + BATCH_SIZE < agreements.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    console.log(`[BACKFILL] Complete: ${updated} updated, ${failed} failed`)

    return NextResponse.json({
      success: true,
      message: `Backfill complete`,
      processed: agreements.length,
      updated,
      failed,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined, // Limit error list
    })
  } catch (error: any) {
    console.error("[BACKFILL] Error:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
  }
}

// GET to check how many agreements need backfill
export async function GET(request: NextRequest) {
  try {
    // Verify super admin
    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
    }

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
    }

    const supabase = createAdminClient()

    // Count agreements with asaas_payment_id but NULL due_date
    const { count, error } = await supabase
      .from("agreements")
      .select("id", { count: "exact", head: true })
      .not("asaas_payment_id", "is", null)
      .is("due_date", null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      needsBackfill: count || 0,
      message: count ? `${count} agreements need due_date backfill` : "All agreements have due_date",
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
  }
}
