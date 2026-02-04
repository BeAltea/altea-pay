import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { profiles, companies } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user) return null
  return session.user
}

export async function getCurrentUserProfile() {
  const session = await auth()
  if (!session?.user?.id) return null

  const [profile] = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      role: profiles.role,
      companyId: profiles.companyId,
      phone: profiles.phone,
      cpfCnpj: profiles.cpfCnpj,
      personType: profiles.personType,
      avatarUrl: profiles.avatarUrl,
      status: profiles.status,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
    })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1)

  if (!profile) return null

  // Also fetch company name if companyId exists
  let companyName: string | null = null
  if (profile.companyId) {
    const [company] = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, profile.companyId))
      .limit(1)
    companyName = company?.name ?? null
  }

  return {
    ...profile,
    companies: companyName ? { name: companyName } : null,
  }
}

export async function isAdmin() {
  const session = await auth()
  return session?.user?.role === "admin"
}

export async function isSuperAdmin() {
  const session = await auth()
  return session?.user?.role === "super_admin"
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
  const session = await auth()
  if (!session?.user || session.user.role !== "user") {
    throw new Error("User access required")
  }
  return session.user
}

export async function isUser() {
  const session = await auth()
  return session?.user?.role === "user"
}

export async function getUserRole() {
  const session = await auth()
  return session?.user?.role ?? null
}

export async function redirectBasedOnRole() {
  const role = await getUserRole()
  if (role === "super_admin") return "/super-admin"
  if (role === "admin") return "/dashboard"
  if (role === "user") return "/user-dashboard"
  return "/auth/login"
}

export async function getUserCompany() {
  const session = await auth()
  if (!session?.user?.companyId) return null

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.user.companyId))
    .limit(1)

  return company ?? null
}

export async function canAccessCompany(companyId: string) {
  const session = await auth()
  if (!session?.user) return false
  if (session.user.role === "super_admin") return true
  return session.user.companyId === companyId
}

export async function getAccessibleCompanies() {
  const session = await auth()
  if (!session?.user) return []

  if (session.user.role === "super_admin") {
    return await db.select().from(companies).orderBy(companies.name)
  }

  if (session.user.companyId) {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, session.user.companyId))
      .limit(1)
    return company ? [company] : []
  }

  return []
}
