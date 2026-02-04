"use server"

import { db } from "@/lib/db"
import { debts, customers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
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

    // Verify debt belongs to company
    const [existingDebt] = await db
      .select({ id: debts.id, customerId: debts.customerId })
      .from(debts)
      .where(
        and(
          eq(debts.id, params.debtId),
          eq(debts.companyId, params.companyId),
        ),
      )
      .limit(1)

    if (!existingDebt) {
      console.error("[v0] Debt validation failed")
      return {
        success: false,
        message: "Divida nao encontrada ou nao pertence a esta empresa",
      }
    }

    // If customer is being changed, verify it belongs to company
    if (params.customerId && params.customerId !== existingDebt.customerId) {
      const [customer] = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.id, params.customerId),
            eq(customers.companyId, params.companyId),
          ),
        )
        .limit(1)

      if (!customer) {
        console.error("[v0] Customer validation failed")
        return {
          success: false,
          message: "Cliente nao encontrado ou nao pertence a esta empresa",
        }
      }
    }

    // Build update object with only provided fields
    const updateData: any = {}
    if (params.customerId !== undefined) updateData.customerId = params.customerId
    if (params.amount !== undefined) updateData.amount = String(params.amount)
    if (params.dueDate !== undefined) updateData.dueDate = params.dueDate
    if (params.description !== undefined) updateData.description = params.description || null
    if (params.status !== undefined) updateData.status = params.status
    if (params.classification !== undefined) updateData.classification = params.classification

    const [data] = await db
      .update(debts)
      .set(updateData)
      .where(
        and(
          eq(debts.id, params.debtId),
          eq(debts.companyId, params.companyId),
        ),
      )
      .returning()

    console.log("[v0] Debt updated successfully:", data.id)

    revalidatePath("/dashboard/debts")

    return {
      success: true,
      message: "Divida atualizada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Update debt exception:", error)
    return {
      success: false,
      message: "Erro ao atualizar divida. Verifique os dados e tente novamente.",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
