"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface CreateCompanyParams {
  name: string
  cnpj: string
  email: string
  phone: string
  address?: string
  city?: string
  state?: string
  zipcode?: string
  status: "active" | "inactive" | "suspended"
}

export interface UpdateCompanyParams extends CreateCompanyParams {
  id: string
}

export interface DeleteCompanyParams {
  id: string
}

export async function createCompany(params: CreateCompanyParams) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: params.name,
        cnpj: params.cnpj,
        email: params.email,
        phone: params.phone,
        address: params.address || null,
        city: params.city || null,
        state: params.state || null,
        zipcode: params.zipcode || null,
        status: params.status,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath("/super-admin/companies")

    return {
      success: true,
      message: "Empresa criada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Create company error:", error)
    return {
      success: false,
      message: "Erro ao criar empresa",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function updateCompany(params: UpdateCompanyParams) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("companies")
      .update({
        name: params.name,
        cnpj: params.cnpj,
        email: params.email,
        phone: params.phone,
        address: params.address || null,
        city: params.city || null,
        state: params.state || null,
        zipcode: params.zipcode || null,
        status: params.status,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/super-admin/companies")
    revalidatePath(`/super-admin/companies/${params.id}`)

    return {
      success: true,
      message: "Empresa atualizada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Update company error:", error)
    return {
      success: false,
      message: "Erro ao atualizar empresa",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function deleteCompany(params: DeleteCompanyParams) {
  try {
    const supabase = await createClient()

    // Check if company has users or data
    const { data: users } = await supabase.from("profiles").select("id").eq("company_id", params.id).limit(1)

    if (users && users.length > 0) {
      return {
        success: false,
        message: "Não é possível excluir empresa com usuários cadastrados",
      }
    }

    const { error } = await supabase.from("companies").delete().eq("id", params.id)

    if (error) throw error

    revalidatePath("/super-admin/companies")

    return {
      success: true,
      message: "Empresa excluída com sucesso!",
    }
  } catch (error) {
    console.error("[v0] Delete company error:", error)
    return {
      success: false,
      message: "Erro ao excluir empresa",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
