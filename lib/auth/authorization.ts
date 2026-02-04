import { auth } from "@/lib/auth/config"

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    throw new Error("Authentication required")
  }
  return session.user
}

export async function requireRole(roles: string[]) {
  const user = await requireAuth()
  if (!roles.includes(user.role)) {
    throw new Error(`Access denied. Required role: ${roles.join(" or ")}`)
  }
  return user
}

export async function requireCompanyAccess(companyId: string) {
  const user = await requireAuth()
  if (user.role === "super_admin") return user
  if (user.companyId !== companyId) {
    throw new Error("Access denied to this company")
  }
  return user
}

export async function getAuthorizedCompanyId() {
  const user = await requireAuth()
  if (user.role === "super_admin") return null // super_admin can access all
  if (!user.companyId) {
    throw new Error("No company associated with this user")
  }
  return user.companyId
}
