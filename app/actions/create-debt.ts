"use server"

import { db } from "@/lib/db"
import { customers, debts } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export interface CreateDebtFormData {
  customerId: string
  amount: number
  dueDate: string
  description: string
  status: "pending" | "in_collection" | "paid" | "written_off" | "in_agreement"
  classification: "low" | "medium" | "high" | "critical"
  companyId: string
}

export async function createDebt(params: CreateDebtFormData) {
  try {
    console.log("[v0] Creating debt with params:", params)

    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.id, params.customerId), eq(customers.companyId, params.companyId)))
      .limit(1)

    if (!customer) {
      console.error("[v0] Customer validation failed")
      return {
        success: false,
        message: "Cliente não encontrado ou não pertence a esta empresa",
      }
    }

    const [data] = await db
      .insert(debts)
      .values({
        customerId: params.customerId,
        amount: params.amount.toString(),
        dueDate: params.dueDate,
        description: params.description || null,
        status: params.status,
        classification: params.classification,
        companyId: params.companyId,
        source: "manual",
      })
      .returning()

    console.log("[v0] Debt created successfully:", data.id)

    revalidatePath("/dashboard/debts")

    return {
      success: true,
      message: "Dívida criada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Create debt exception:", error)
    return {
      success: false,
      message: "Erro ao criar dívida. Verifique os dados e tente novamente.",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
