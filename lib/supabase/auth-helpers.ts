import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient()
  const user = await getCurrentUser()

  if (!user) return null

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return profile
}

export async function isAdmin() {
  const profile = await getCurrentUserProfile()
  return profile?.role === "admin"
}

export async function requireAdmin() {
  const adminStatus = await isAdmin()
  if (!adminStatus) {
    throw new Error("Admin access required")
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

  if (role === "admin") {
    return "/dashboard"
  } else if (role === "user") {
    return "/user-dashboard"
  }

  return "/auth/login"
}
