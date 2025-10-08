"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface CreateDebtFormData {
  customerId: string
  amount: number
  dueDate: string
  description: string
  status: "pending" | "paid" | "cancelled" | "in_negotiation"
  classification: "low" | "medium" | "high" | "critical"
  companyId: string
}

export async function createDebt(params: CreateDebtFormData) {
  try {
    console.log("[v0] Creating debt with params:", params)

    const supabase = await createClient()

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
      message: "Erro ao criar dívida. Verifique os dados e tente novamente.",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
