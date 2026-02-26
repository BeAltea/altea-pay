import { createAdminClient, createClient } from "@/lib/supabase/server"
import { UsersClient } from "@/components/super-admin/users-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface User {
  id: string
  email: string
  full_name: string
  role: "super_admin" | "admin" | "user"
  company_name?: string
  company_id?: string
  status: "active" | "inactive" | "suspended"
  last_login?: string
  created_at: string
}

interface Company {
  id: string
  name: string
}

async function fetchData() {
  const supabase = createAdminClient()

  // Fetch profiles, companies, and auth users in parallel
  const [profilesResult, companiesResult, authUsersResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        role,
        company_id,
        created_at,
        companies (
          name
        )
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("companies")
      .select("id, name")
      .order("name"),
    supabase.auth.admin.listUsers({ perPage: 1000 })
  ])

  if (profilesResult.error) {
    console.error("[UsersPage] Error fetching profiles:", profilesResult.error)
  }

  if (companiesResult.error) {
    console.error("[UsersPage] Error fetching companies:", companiesResult.error)
  }

  // Build a map of user ID -> banned status
  const bannedUsers = new Map<string, boolean>()
  const lastSignInMap = new Map<string, string | null>()

  if (authUsersResult.data?.users) {
    for (const authUser of authUsersResult.data.users) {
      // Check if user is banned (banned_until is set and in the future)
      const isBanned = authUser.banned_until
        ? new Date(authUser.banned_until) > new Date()
        : false
      bannedUsers.set(authUser.id, isBanned)
      lastSignInMap.set(authUser.id, authUser.last_sign_in_at || null)
    }
  }

  console.log("[UsersPage] Profiles fetched:", profilesResult.data?.length || 0)
  console.log("[UsersPage] Companies fetched:", companiesResult.data?.length || 0)
  console.log("[UsersPage] Auth users fetched:", authUsersResult.data?.users?.length || 0)

  // Transform to User format with banned status
  const users: User[] = (profilesResult.data || []).map((profile: any) => {
    const isBanned = bannedUsers.get(profile.id) || false
    const lastSignIn = lastSignInMap.get(profile.id)

    return {
      id: profile.id,
      email: profile.email || "",
      full_name: profile.full_name || "Sem nome",
      role: profile.role || "user",
      company_name: profile.companies?.name,
      company_id: profile.company_id,
      status: isBanned ? "suspended" : "active" as const,
      last_login: lastSignIn || undefined,
      created_at: profile.created_at,
    }
  })

  const companies: Company[] = companiesResult.data || []

  return { users, companies }
}

async function getCurrentUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id
}

export default async function UsersPage() {
  const [{ users, companies }, currentUserId] = await Promise.all([
    fetchData(),
    getCurrentUserId()
  ])

  return (
    <UsersClient
      initialUsers={users}
      companies={companies}
      currentUserId={currentUserId}
    />
  )
}
