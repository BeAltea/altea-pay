"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface CreateCustomerParams {
  name: string
  email: string
  document: string
  phone?: string
  companyId: string
}

export interface UpdateCustomerParams extends CreateCustomerParams {
  id: string
}

export interface DeleteCustomerParams {
  id: string
  companyId: string
}

export async function createCustomer(params: CreateCustomerParams) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: params.name,
        email: params.email,
        document: params.document,
        phone: params.phone || null,
        company_id: params.companyId,
        source: "manual",
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath("/dashboard/customers")

    return {
      success: true,
      message: "Cliente criado com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Create customer error:", error)
    return {
      success: false,
      message: "Erro ao criar cliente",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function updateCustomer(params: UpdateCustomerParams) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("customers")
      .update({
        name: params.name,
        email: params.email,
        document: params.document,
        phone: params.phone || null,
      })
      .eq("id", params.id)
      .eq("company_id", params.companyId)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/dashboard/customers")

    return {
      success: true,
      message: "Cliente atualizado com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Update customer error:", error)
    return {
      success: false,
      message: "Erro ao atualizar cliente",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function deleteCustomer(params: DeleteCustomerParams) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from("customers").delete().eq("id", params.id).eq("company_id", params.companyId)

    if (error) throw error

    revalidatePath("/dashboard/customers")

    return {
      success: true,
      message: "Cliente excluído com sucesso!",
    }
  } catch (error) {
    console.error("[v0] Delete customer error:", error)
    return {
      success: false,
      message: "Erro ao excluir cliente",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
