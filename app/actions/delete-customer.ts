"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function deleteCustomer(customerId: string, companyId: string) {
  try {
    const supabase = await createClient()

    // Verificar se o cliente existe
    const { data: customer, error: fetchError } = await supabase
      .from("VMAX")
      .select("id, Cliente")
      .eq("id", customerId)
      .eq("id_company", companyId)
      .single()

    if (fetchError || !customer) {
      return { success: false, message: "Cliente não encontrado" }
    }

    // Deletar acordos relacionados
    await supabase.from("agreements").delete().eq("customer_id", customerId)

    // Deletar dívidas relacionadas
    await supabase.from("debts").delete().eq("customer_id", customerId)

    // Deletar pagamentos relacionados
    await supabase.from("payments").delete().eq("customer_id", customerId)

    // Deletar notificações relacionadas
    await supabase.from("notifications").delete().eq("customer_id", customerId)

    // Deletar tarefas de cobrança relacionadas
    await supabase.from("collection_tasks").delete().eq("customer_id", customerId)

    // Deletar o registro do cliente na tabela customers (se existir)
    await supabase.from("customers").delete().eq("id", customerId)

    // Deletar o registro VMAX (fonte principal)
    const { error: deleteError } = await supabase.from("VMAX").delete().eq("id", customerId).eq("id_company", companyId)

    if (deleteError) {
      console.error("[v0] Erro ao deletar cliente:", deleteError)
      return { success: false, message: `Erro ao deletar cliente: ${deleteError.message}` }
    }

    revalidatePath("/dashboard/clientes")
    revalidatePath(`/super-admin/companies/${companyId}`)
    revalidatePath(`/super-admin/companies/${companyId}/customers`)

    return {
      success: true,
      message: `Cliente ${customer.Cliente} e todos os dados relacionados foram excluídos permanentemente`,
    }
  } catch (error) {
    console.error("[v0] Erro inesperado ao deletar cliente:", error)
    return { success: false, message: "Erro inesperado ao deletar cliente" }
  }
}
