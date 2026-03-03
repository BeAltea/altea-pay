import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

interface UpdateItem {
  client_id: string
  email?: string
  phone?: string
  whatsapp?: boolean
  assertiva_protocolo: string
}

interface UpdateRequest {
  updates: UpdateItem[]
  company_id: string
}

interface UpdateDetailItem {
  client_id: string
  email_updated: boolean
  phone_updated: boolean
  skipped_reason?: string
}

/**
 * POST /api/super-admin/localize/update
 *
 * Apply Assertiva Localize results to client records.
 * CRITICAL: Only updates fields that are currently NULL or empty.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const body: UpdateRequest = await request.json()
    const { updates, company_id } = body

    if (!company_id) {
      return NextResponse.json(
        { error: "company_id é obrigatório" },
        { status: 400 }
      )
    }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "updates deve ser um array não vazio" },
        { status: 400 }
      )
    }

    // Verify company exists
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      )
    }

    const details: UpdateDetailItem[] = []
    let updated = 0
    let skipped = 0
    let errors = 0

    console.log(`[Localize Update] Processing ${updates.length} updates for company ${company_id}`)

    for (const update of updates) {
      const { client_id, email, phone, whatsapp, assertiva_protocolo } = update

      console.log(`[Localize Update] Processing client ${client_id}: email=${email}, phone=${phone}`)

      try {
        // CRITICAL: Fetch current client data to verify fields are empty
        const { data: client, error: clientError } = await supabase
          .from("VMAX")
          .select(`id, Email, "Telefone 1", id_company`)
          .eq("id", client_id)
          .eq("id_company", company_id)
          .single()

        console.log(`[Localize Update] Client ${client_id} BEFORE:`, {
          found: !!client,
          error: clientError?.message,
          currentEmail: client?.Email,
          currentPhone: client?.["Telefone 1"],
        })

        if (clientError || !client) {
          console.error(`[Localize Update] Client ${client_id} not found:`, clientError)
          details.push({
            client_id,
            email_updated: false,
            phone_updated: false,
            skipped_reason: `Cliente não encontrado: ${clientError?.message || 'null'}`,
          })
          errors++
          continue
        }

        const currentEmail = client.Email?.trim() || ""
        const currentPhone = client["Telefone 1"]?.trim() || ""

        let emailUpdated = false
        let phoneUpdated = false
        const skippedReasons: string[] = []

        // Prepare update object
        const updateData: Record<string, any> = {}

        // Only update email if current is empty AND new email is provided
        if (email && email.trim() !== "") {
          if (currentEmail === "") {
            updateData.Email = email.trim()
            emailUpdated = true
            console.log(`[Localize Update] Will update email to: ${email.trim()}`)
          } else {
            skippedReasons.push(`Email já existente: ${currentEmail}`)
            console.log(`[Localize Update] Skipping email - already has: ${currentEmail}`)
          }
        } else {
          console.log(`[Localize Update] No email provided to update`)
        }

        // Only update phone if current is empty AND new phone is provided
        if (phone && phone.trim() !== "") {
          if (currentPhone === "") {
            updateData["Telefone 1"] = phone.trim()
            phoneUpdated = true
            console.log(`[Localize Update] Will update phone to: ${phone.trim()}`)
          } else {
            skippedReasons.push(`Telefone já existente: ${currentPhone}`)
            console.log(`[Localize Update] Skipping phone - already has: ${currentPhone}`)
          }
        } else {
          console.log(`[Localize Update] No phone provided to update`)
        }

        // Apply update if there's anything to update
        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString()

          console.log(`[Localize Update] Executing update with data:`, updateData)

          const { data: updateResult, error: updateError } = await supabase
            .from("VMAX")
            .update(updateData)
            .eq("id", client_id)
            .eq("id_company", company_id)
            .select()

          console.log(`[Localize Update] Update result:`, {
            data: updateResult,
            error: updateError?.message,
            rowsAffected: updateResult?.length || 0,
          })

          if (updateError) {
            console.error(`[Localize Update] Error updating client ${client_id}:`, updateError)
            details.push({
              client_id,
              email_updated: false,
              phone_updated: false,
              skipped_reason: `Erro ao atualizar: ${updateError.message}`,
            })
            errors++
            continue
          }

          if (!updateResult || updateResult.length === 0) {
            console.error(`[Localize Update] Update returned no rows for client ${client_id}`)
            details.push({
              client_id,
              email_updated: false,
              phone_updated: false,
              skipped_reason: "Update não retornou dados - possível problema de RLS ou ID inválido",
            })
            errors++
            continue
          }

          // Verify the update actually worked
          const { data: afterUpdate } = await supabase
            .from("VMAX")
            .select(`id, Email, "Telefone 1"`)
            .eq("id", client_id)
            .single()

          console.log(`[Localize Update] Client ${client_id} AFTER:`, {
            email: afterUpdate?.Email,
            phone: afterUpdate?.["Telefone 1"],
          })

          // Update the log record to mark data as applied
          if (assertiva_protocolo) {
            await supabase
              .from("assertiva_localize_logs")
              .update({
                email_applied: emailUpdated ? email : null,
                phone_applied: phoneUpdated ? phone : null,
                applied_at: new Date().toISOString(),
              })
              .eq("assertiva_protocolo", assertiva_protocolo)
              .eq("client_id", client_id)
          }

          updated++
        } else {
          console.log(`[Localize Update] Nothing to update for client ${client_id}`)
          skipped++
        }

        details.push({
          client_id,
          email_updated: emailUpdated,
          phone_updated: phoneUpdated,
          skipped_reason: skippedReasons.length > 0 ? skippedReasons.join("; ") : undefined,
        })
      } catch (error: any) {
        console.error(`[Localize Update] Error processing client ${client_id}:`, error)
        details.push({
          client_id,
          email_updated: false,
          phone_updated: false,
          skipped_reason: `Erro: ${error.message}`,
        })
        errors++
      }
    }

    console.log(`[Localize Update] Completed: ${updated} updated, ${skipped} skipped, ${errors} errors`)

    return NextResponse.json({
      updated,
      skipped,
      errors,
      details,
    })
  } catch (error: any) {
    console.error("[Localize Update] Error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error.message },
      { status: 500 }
    )
  }
}
