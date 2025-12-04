"use server"

import { createServerClient, createAdminClient } from "@/lib/supabase/server"

export async function writeOffDebt(data: {
  debtId: string
  paymentMethod: string
  paymentChannel: string
  paymentDate: string
  notes?: string
}) {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: "Usuário não autenticado" }
    }

    const { data: profile } = await supabase.from("profiles").select("company_id, full_name").eq("id", user.id).single()

    if (!profile?.company_id) {
      return { success: false, message: "Empresa não encontrada" }
    }

    // Get debt details from VMAX
    const { data: debt, error: debtError } = await adminSupabase
      .from("VMAX")
      .select("*")
      .eq("id", data.debtId)
      .eq("id_company", profile.company_id)
      .single()

    if (debtError || !debt) {
      console.error("[v0] Debt not found:", debtError)
      return { success: false, message: "Dívida não encontrada na base de dados" }
    }

    // Create payment record
    const { error: paymentError } = await adminSupabase.from("payments").insert({
      debt_id: data.debtId,
      company_id: profile.company_id,
      user_id: user.id,
      amount: debt.Vencido ? Number.parseFloat(debt.Vencido.toString().replace(",", ".")) : 0,
      payment_date: data.paymentDate,
      payment_method: data.paymentMethod,
      status: "confirmed",
      transaction_id: `WRITEOFF-${Date.now()}`,
    })

    if (paymentError) {
      console.error("[v0] Error creating payment:", paymentError)
      return { success: false, message: "Erro ao registrar pagamento" }
    }

    // Update debt status in VMAX
    const { error: updateError } = await adminSupabase
      .from("VMAX")
      .update({
        approval_status: "PAID",
        analysis_metadata: {
          ...debt.analysis_metadata,
          payment_info: {
            method: data.paymentMethod,
            channel: data.paymentChannel,
            date: data.paymentDate,
            notes: data.notes,
            written_off_by: profile.full_name,
            written_off_at: new Date().toISOString(),
          },
        },
      })
      .eq("id", data.debtId)

    if (updateError) {
      console.error("[v0] Error updating debt status:", updateError)
      return { success: false, message: "Erro ao atualizar status da dívida" }
    }

    // Log the write-off action
    await adminSupabase.from("collection_actions").insert({
      company_id: profile.company_id,
      debt_id: data.debtId,
      customer_id: debt.id,
      action_type: "write_off",
      status: "sent",
      message: `Dívida baixada via ${data.paymentChannel} - ${data.paymentMethod}`,
      sent_by: user.id,
      metadata: {
        payment_method: data.paymentMethod,
        payment_channel: data.paymentChannel,
        payment_date: data.paymentDate,
        notes: data.notes,
      },
    })

    return {
      success: true,
      message: "Dívida baixada com sucesso!",
    }
  } catch (error) {
    console.error("[v0] Error in writeOffDebt:", error)
    return {
      success: false,
      message: "Erro inesperado ao baixar dívida",
    }
  }
}
