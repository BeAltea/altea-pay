import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { profiles, companies } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user) return null
  return {
    id: session.user.id,
    email: session.user.email,
    user_metadata: {
      full_name: session.user.fullName ?? session.user.name,
    },
  }
}

export async function getCurrentUserProfile() {
  const session = await auth()
  if (!session?.user) return null

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1)

  if (!profile) return null

  let companyData = null
  if (profile.companyId) {
    const [c] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, profile.companyId))
      .limit(1)
    companyData = c ?? null
  }

  return {
    ...profile,
    // Provide snake_case aliases for backward compat
    company_id: profile.companyId,
    full_name: profile.fullName,
    cpf_cnpj: profile.cpfCnpj,
    person_type: profile.personType,
    avatar_url: profile.avatarUrl,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
    companies: companyData ? { name: companyData.name } : null,
  }
}

export async function isAdmin() {
  const profile = await getCurrentUserProfile()
  return profile?.role === "admin"
}

export async function isSuperAdmin() {
  const profile = await getCurrentUserProfile()
  return profile?.role === "super_admin"
}

export async function requireAdmin() {
  const adminStatus = await isAdmin()
  if (!adminStatus) {
    throw new Error("Admin access required")
  }
  return true
}

export async function requireSuperAdmin() {
  const superAdminStatus = await isSuperAdmin()
  if (!superAdminStatus) {
    throw new Error("Super admin access required")
  }
  return true
}

export async function requireUser() {
  const profile = await getCurrentUserProfile()
  if (!profile || profile.role !== "user") {
    throw new Error("User access required")
  }
  return profile
}

export async function isUser() {
  const profile = await getCurrentUserProfile()
  return profile?.role === "user"
}

export async function getUserRole() {
  const profile = await getCurrentUserProfile()
  return profile?.role || null
}

export async function redirectBasedOnRole() {
  const role = await getUserRole()

  if (role === "super_admin") {
    return "/super-admin"
  } else if (role === "admin") {
    return "/dashboard"
  } else if (role === "user") {
    return "/user-dashboard"
  }

  return "/auth/login"
}

export async function getUserCompany() {
  const profile = await getCurrentUserProfile()
  if (!profile?.companyId) return null

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, profile.companyId))
    .limit(1)

  return company ?? null
}

export async function canAccessCompany(companyId: string) {
  const profile = await getCurrentUserProfile()

  if (profile?.role === "super_admin") {
    return true
  }

  return profile?.companyId === companyId
}

export async function getAccessibleCompanies() {
  const profile = await getCurrentUserProfile()

  if (profile?.role === "super_admin") {
    const allCompanies = await db
      .select()
      .from(companies)
      .orderBy(companies.name)
    return allCompanies
  } else if (profile?.companyId) {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, profile.companyId))
      .limit(1)
    return company ? [company] : []
  }

  return []
}
