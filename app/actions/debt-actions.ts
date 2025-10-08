"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface CreateDebtParams {
  customerId: string
  amount: number
  dueDate: string
  description?: string
  status: "pending" | "paid" | "cancelled" | "in_negotiation"
  classification: "low" | "medium" | "high" | "critical"
  companyId: string
}

export interface UpdateDebtParams extends CreateDebtParams {
  id: string
}

export interface DeleteDebtParams {
  id: string
  companyId: string
}

export async function createDebt(params: CreateDebtParams) {
  try {
    const supabase = await createClient()

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", params.customerId)
      .eq("company_id", params.companyId)
      .single()

    if (customerError || !customer) {
      return {
        success: false,
        message: "Cliente não encontrado ou não pertence a esta empresa",
      }
    }

    const { data, error } = await supabase
      .from("debts")
      .insert({
        customer_id: params.customerId,
        amount: params.amount,
        due_date: params.dueDate,
        description: params.description || null,
        status: params.status,
        classification: params.classification,
        company_id: params.companyId,
        source: "manual",
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Create debt error:", error)
      throw error
    }

    console.log("[v0] Debt created successfully:", data.id)
    revalidatePath("/dashboard/debts")

    return {
      success: true,
      message: "Dívida criada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Create debt error:", error)
    return {
      success: false,
      message: "Erro ao criar dívida",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function updateDebt(params: UpdateDebtParams) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("debts")
      .update({
        customer_id: params.customerId,
        amount: params.amount,
        due_date: params.dueDate,
        description: params.description || null,
        status: params.status,
        classification: params.classification,
      })
      .eq("id", params.id)
      .eq("company_id", params.companyId)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/dashboard/debts")

    return {
      success: true,
      message: "Dívida atualizada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Update debt error:", error)
    return {
      success: false,
      message: "Erro ao atualizar dívida",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function deleteDebt(params: DeleteDebtParams) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from("debts").delete().eq("id", params.id).eq("company_id", params.companyId)

    if (error) throw error

    revalidatePath("/dashboard/debts")

    return {
      success: true,
      message: "Dívida excluída com sucesso!",
    }
  } catch (error) {
    console.error("[v0] Delete debt error:", error)
    return {
      success: false,
      message: "Erro ao excluir dívida",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
