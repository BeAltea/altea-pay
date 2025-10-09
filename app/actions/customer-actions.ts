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
    console.log("[v0] createCustomer - Starting with params:", JSON.stringify(params, null, 2))

    const supabase = await createClient()
    console.log("[v0] createCustomer - Supabase client created")

    if (!params.name || !params.email || !params.document || !params.companyId) {
      console.log("[v0] createCustomer - Missing required fields")
      return {
        success: false,
        message: "Todos os campos obrigatórios devem ser preenchidos",
        error: "Missing required fields",
      }
    }

    const documentType = params.document.replace(/\D/g, "").length === 11 ? "CPF" : "CNPJ"
    console.log("[v0] createCustomer - Document type determined:", documentType)

    const customerData = {
      name: params.name,
      email: params.email,
      document: params.document,
      document_type: documentType,
      phone: params.phone || null,
      company_id: params.companyId,
    }

    console.log("[v0] createCustomer - Inserting customer with data:", JSON.stringify(customerData, null, 2))

    const { data, error } = await supabase.from("customers").insert(customerData).select().single()

    if (error) {
      console.error("[v0] createCustomer - Database error:", JSON.stringify(error, null, 2))
      console.error("[v0] createCustomer - Error code:", error.code)
      console.error("[v0] createCustomer - Error message:", error.message)
      console.error("[v0] createCustomer - Error details:", error.details)
      console.error("[v0] createCustomer - Error hint:", error.hint)
      return {
        success: false,
        message: `Erro ao criar cliente: ${error.message}`,
        error: error.message,
      }
    }

    console.log("[v0] createCustomer - Customer created successfully:", JSON.stringify(data, null, 2))

    revalidatePath("/dashboard/customers")

    return {
      success: true,
      message: "Cliente criado com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] createCustomer - Unexpected error:", error)
    console.error("[v0] createCustomer - Error type:", typeof error)
    console.error("[v0] createCustomer - Error constructor:", error?.constructor?.name)

    if (error instanceof Error) {
      console.error("[v0] createCustomer - Error message:", error.message)
      console.error("[v0] createCustomer - Error stack:", error.stack)
    }

    return {
      success: false,
      message: "Erro inesperado ao criar cliente",
      error: error instanceof Error ? error.message : String(error),
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
