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

export async function getUserById(userId: string) {
  try {
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(`
        *,
        companies (
          id,
          name
        )
      `)
      .eq("id", userId)
      .single()

    if (error) throw error

    return {
      success: true,
      data: profile,
    }
  } catch (error) {
    console.error("[v0] Get user by ID error:", error)
    return {
      success: false,
      message: "Erro ao buscar usuário",
      error: error instanceof Error ? error.message : "Unknown error",
      data: null,
    }
  }
}

export async function getCompanies() {
  try {
    const supabase = await createClient()

    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name")
      .order("name")

    if (error) throw error

    return {
      success: true,
      data: companies || [],
    }
  } catch (error) {
    console.error("[v0] Get companies error:", error)
    return {
      success: false,
      data: [],
    }
  }
}

export async function updateUserProfile(params: {
  id: string
  full_name: string
  email?: string
  role: "super_admin" | "admin" | "user"
  status?: "active" | "inactive" | "suspended"
  company_id?: string | null
  phone?: string
  address?: string
  city?: string
  state?: string
  notes?: string
}) {
  try {
    const supabase = await createClient()

    const updateData: Record<string, unknown> = {
      full_name: params.full_name,
      role: params.role,
    }

    if (params.company_id !== undefined) {
      updateData.company_id = params.company_id || null
    }
    if (params.phone !== undefined) {
      updateData.phone = params.phone
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/super-admin/users")
    revalidatePath(`/super-admin/users/${params.id}`)
    revalidatePath(`/super-admin/users/${params.id}/edit`)

    return {
      success: true,
      message: "Usuário atualizado com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Update user profile error:", error)
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
