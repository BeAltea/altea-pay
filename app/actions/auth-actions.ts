"use server"

import { signIn } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { users, profiles, passwordResetTokens, companies } from "@/lib/db/schema"
import { eq, or } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"
import { Resend } from "resend"
import { AuthError } from "next-auth"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    // Get user profile to determine redirect
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      return { success: false, error: "Credenciais inválidas" }
    }

    const [profile] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)

    const role = profile?.role ?? "user"
    const redirectTo =
      role === "super_admin"
        ? "/super-admin"
        : role === "admin"
          ? "/dashboard"
          : "/user-dashboard"

    return { success: true, redirectTo }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Credenciais inválidas" }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao fazer login",
    }
  }
}

export async function registerAction(params: {
  email: string
  password: string
  fullName: string
  phone?: string
  cpfCnpj?: string
  personType?: "PF" | "PJ"
  companyName?: string
}) {
  try {
    const { email, password, fullName, phone, cpfCnpj, personType, companyName } = params

    // Check if user already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existing) {
      return { success: false, error: "Este email já está cadastrado. Tente fazer login." }
    }

    // Check if this cpf/cnpj matches a company
    let role = "user"
    let companyId: string | null = null
    let detectedCompanyName = companyName || "Sem empresa"

    if (cpfCnpj) {
      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, "")
      const [foundCompany] = await db
        .select()
        .from(companies)
        .where(or(eq(companies.cnpj, cleanCpfCnpj), eq(companies.cnpj, cpfCnpj), eq(companies.email, email)))
        .limit(1)

      if (foundCompany) {
        role = "admin"
        companyId = foundCompany.id
        detectedCompanyName = foundCompany.name
      }
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12)

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name: fullName.trim(),
      })
      .returning()

    // Create profile
    await db.insert(profiles).values({
      id: newUser.id,
      email,
      fullName: fullName.trim(),
      role,
      companyId,
      phone: phone || null,
      cpfCnpj: cpfCnpj || null,
      personType: personType || null,
    })

    return {
      success: true,
      userId: newUser.id,
      role,
      companyId,
      companyName: detectedCompanyName,
    }
  } catch (error) {
    console.error("[auth] Register error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar conta",
    }
  }
}

export async function forgotPasswordAction(email: string) {
  try {
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      // Don't reveal if user exists
      return { success: true }
    }

    // Generate token
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    })

    // Send email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

    if (resend) {
      await resend.emails.send({
        from: "Altea Pay <noreply@alteapay.com.br>",
        to: email,
        subject: "Recuperação de senha - Altea Pay",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Recuperação de Senha</h2>
            <p>Você solicitou a recuperação de senha da sua conta Altea Pay.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1a1f36; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Redefinir senha
            </a>
            <p style="color: #666; font-size: 14px;">Este link expira em 1 hora.</p>
            <p style="color: #666; font-size: 14px;">Se você não solicitou esta recuperação, ignore este email.</p>
          </div>
        `,
      })
    }

    return { success: true }
  } catch (error) {
    console.error("[auth] Forgot password error:", error)
    return {
      success: false,
      error: "Erro ao enviar email de recuperação",
    }
  }
}

export async function resetPasswordAction(token: string, newPassword: string) {
  try {
    // Find valid token
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1)

    if (!resetToken) {
      return { success: false, error: "Token inválido" }
    }

    if (resetToken.expiresAt < new Date()) {
      return { success: false, error: "O link de recuperação expirou. Solicite um novo link." }
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, 12)

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId))

    // Delete used token
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, resetToken.id))

    return { success: true }
  } catch (error) {
    console.error("[auth] Reset password error:", error)
    return {
      success: false,
      error: "Erro ao atualizar senha",
    }
  }
}

export async function adminCreateUserAction(params: {
  email: string
  password: string
  fullName: string
  role: "super_admin" | "admin" | "user"
  companyId?: string
}) {
  try {
    const { email, password, fullName, role, companyId } = params

    // Check if user already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existing) {
      return { success: false, error: "Email já cadastrado" }
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name: fullName,
        emailVerified: new Date(),
      })
      .returning()

    const [profile] = await db
      .insert(profiles)
      .values({
        id: newUser.id,
        email,
        fullName,
        role,
        companyId: companyId || null,
      })
      .returning()

    return { success: true, data: profile }
  } catch (error) {
    console.error("[auth] Admin create user error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar usuário",
    }
  }
}
