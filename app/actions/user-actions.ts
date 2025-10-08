"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface CreateUserParams {
  email: string
  password: string
  fullName: string
  role: "super_admin" | "admin" | "user"
  companyId?: string
}

export interface UpdateUserParams {
  id: string
  fullName: string
  role: "super_admin" | "admin" | "user"
  companyId?: string
  status: "active" | "inactive" | "suspended"
}

export interface DeleteUserParams {
  id: string
}

export async function createUser(params: CreateUserParams) {
  try {
    const supabase = await createClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
    })

    if (authError) throw authError

    // Create profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        email: params.email,
        full_name: params.fullName,
        role: params.role,
        company_id: params.companyId || null,
      })
      .select()
      .single()

    if (profileError) throw profileError

    revalidatePath("/super-admin/users")

    return {
      success: true,
      message: "Usuário criado com sucesso!",
      data: profileData,
    }
  } catch (error) {
    console.error("[v0] Create user error:", error)
    return {
      success: false,
      message: "Erro ao criar usuário",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function updateUser(params: UpdateUserParams) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: params.fullName,
        role: params.role,
        company_id: params.companyId || null,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/super-admin/users")
    revalidatePath(`/super-admin/users/${params.id}`)

    return {
      success: true,
      message: "Usuário atualizado com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Update user error:", error)
    return {
      success: false,
      message: "Erro ao atualizar usuário",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function deleteUser(params: DeleteUserParams) {
  try {
    const supabase = await createClient()

    // Delete profile (auth user will be handled by trigger)
    const { error } = await supabase.from("profiles").delete().eq("id", params.id)

    if (error) throw error

    revalidatePath("/super-admin/users")

    return {
      success: true,
      message: "Usuário excluído com sucesso!",
    }
  } catch (error) {
    console.error("[v0] Delete user error:", error)
    return {
      success: false,
      message: "Erro ao excluir usuário",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
