"use server"

import { db } from "@/lib/db"
import { vmax, agreements, debts, payments, notifications, collectionTasks, customers } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function deleteCustomer(customerId: string, companyId: string) {
  try {
    // Verificar se o cliente existe
    const [customer] = await db
      .select({ id: vmax.id, cliente: vmax.cliente })
      .from(vmax)
      .where(
        and(
          eq(vmax.id, customerId),
          eq(vmax.idCompany, companyId),
        ),
      )
      .limit(1)

    if (!customer) {
      return { success: false, message: "Cliente nao encontrado" }
    }

    // Deletar acordos relacionados
    await db.delete(agreements).where(eq(agreements.customerId, customerId))

    // Deletar dividas relacionadas
    await db.delete(debts).where(eq(debts.customerId, customerId))

    // Deletar pagamentos relacionados
    await db.delete(payments).where(eq(payments.customerId, customerId))

    // Deletar notificacoes relacionadas
    await db.delete(notifications).where(eq(notifications.customerId, customerId))

    // Deletar tarefas de cobranca relacionadas
    await db.delete(collectionTasks).where(eq(collectionTasks.customerId, customerId))

    // Deletar o registro do cliente na tabela customers (se existir)
    await db.delete(customers).where(eq(customers.id, customerId))

    // Deletar o registro VMAX (fonte principal)
    await db
      .delete(vmax)
      .where(
        and(
          eq(vmax.id, customerId),
          eq(vmax.idCompany, companyId),
        ),
      )

    revalidatePath("/dashboard/clientes")
    revalidatePath(`/super-admin/companies/${companyId}`)
    revalidatePath(`/super-admin/companies/${companyId}/customers`)

    return {
      success: true,
      message: `Cliente ${customer.cliente} e todos os dados relacionados foram excluidos permanentemente`,
    }
  } catch (error) {
    console.error("[v0] Erro inesperado ao deletar cliente:", error)
    return { success: false, message: "Erro inesperado ao deletar cliente" }
  }
}
