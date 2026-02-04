"use server"

import { db } from "@/lib/db"
import { profiles, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

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
    // Create auth user
    const passwordHash = await bcrypt.hash(params.password, 12)

    const [authData] = await db
      .insert(users)
      .values({
        email: params.email,
        passwordHash,
        name: params.fullName,
        emailVerified: new Date(),
      })
      .returning()

    // Create profile
    const [profileData] = await db
      .insert(profiles)
      .values({
        id: authData.id,
        email: params.email,
        fullName: params.fullName,
        role: params.role,
        companyId: params.companyId || null,
      })
      .returning()

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
    const [data] = await db
      .update(profiles)
      .set({
        fullName: params.fullName,
        role: params.role,
        companyId: params.companyId || null,
      })
      .where(eq(profiles.id, params.id))
      .returning()

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
    // Delete profile (auth user will be handled by cascade)
    await db.delete(profiles).where(eq(profiles.id, params.id))

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
