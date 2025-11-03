"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface UpdateDebtFormData {
  debtId: string
  customerId?: string
  amount?: number
  dueDate?: string
  description?: string
  status?: "pending" | "in_collection" | "paid" | "written_off" | "in_agreement"
  classification?: "low" | "medium" | "high" | "critical"
  companyId: string
}

export async function updateDebt(params: UpdateDebtFormData) {
  try {
    console.log("[v0] Updating debt with params:", params)

    const supabase = await createClient()

    // Verify debt belongs to company
    const { data: existingDebt, error: debtError } = await supabase
      .from("debts")
      .select("id, customer_id")
      .eq("id", params.debtId)
      .eq("company_id", params.companyId)
      .single()

    if (debtError || !existingDebt) {
      console.error("[v0] Debt validation failed:", debtError)
      return {
        success: false,
        message: "Dívida não encontrada ou não pertence a esta empresa",
      }
    }

    // If customer is being changed, verify it belongs to company
    if (params.customerId && params.customerId !== existingDebt.customer_id) {
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id")
        .eq("id", params.customerId)
        .eq("company_id", params.companyId)
        .single()

      if (customerError || !customer) {
        console.error("[v0] Customer validation failed:", customerError)
        return {
          success: false,
          message: "Cliente não encontrado ou não pertence a esta empresa",
        }
      }
    }

    // Build update object with only provided fields
    const updateData: any = {}
    if (params.customerId !== undefined) updateData.customer_id = params.customerId
    if (params.amount !== undefined) updateData.amount = params.amount
    if (params.dueDate !== undefined) updateData.due_date = params.dueDate
    if (params.description !== undefined) updateData.description = params.description || null
    if (params.status !== undefined) updateData.status = params.status
    if (params.classification !== undefined) updateData.classification = params.classification

    const { data, error } = await supabase
      .from("debts")
      .update(updateData)
      .eq("id", params.debtId)
      .eq("company_id", params.companyId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Update debt error:", error)
      throw error
    }

    console.log("[v0] Debt updated successfully:", data.id)

    revalidatePath("/dashboard/debts")

    return {
      success: true,
      message: "Dívida atualizada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Update debt exception:", error)
    return {
      success: false,
      message: "Erro ao atualizar dívida. Verifique os dados e tente novamente.",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
