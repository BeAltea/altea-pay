"use server"

import { db } from "@/lib/db"
import { debts, customers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
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
      return {
        success: false,
        message: "Cliente nao encontrado ou nao pertence a esta empresa",
      }
    }

    const [data] = await db
      .insert(debts)
      .values({
        customerId: params.customerId,
        amount: String(params.amount),
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
      message: "Divida criada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Create debt error:", error)
    return {
      success: false,
      message: "Erro ao criar divida",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function updateDebt(params: UpdateDebtParams) {
  try {
    const [data] = await db
      .update(debts)
      .set({
        customerId: params.customerId,
        amount: String(params.amount),
        dueDate: params.dueDate,
        description: params.description || null,
        status: params.status,
        classification: params.classification,
      })
      .where(
        and(
          eq(debts.id, params.id),
          eq(debts.companyId, params.companyId),
        ),
      )
      .returning()

    revalidatePath("/dashboard/debts")

    return {
      success: true,
      message: "Divida atualizada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Update debt error:", error)
    return {
      success: false,
      message: "Erro ao atualizar divida",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function deleteDebt(params: DeleteDebtParams) {
  try {
    await db
      .delete(debts)
      .where(
        and(
          eq(debts.id, params.id),
          eq(debts.companyId, params.companyId),
        ),
      )

    revalidatePath("/dashboard/debts")

    return {
      success: true,
      message: "Divida excluida com sucesso!",
    }
  } catch (error) {
    console.error("[v0] Delete debt error:", error)
    return {
      success: false,
      message: "Erro ao excluir divida",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
