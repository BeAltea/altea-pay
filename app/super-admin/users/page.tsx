import { createAdminClient } from "@/lib/supabase/server"
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

  // Fetch profiles and companies in parallel
  const [profilesResult, companiesResult] = await Promise.all([
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
      .order("name")
  ])

  if (profilesResult.error) {
    console.error("[UsersPage] Error fetching profiles:", profilesResult.error)
  }

  if (companiesResult.error) {
    console.error("[UsersPage] Error fetching companies:", companiesResult.error)
  }

  console.log("[UsersPage] Profiles fetched:", profilesResult.data?.length || 0)
  console.log("[UsersPage] Companies fetched:", companiesResult.data?.length || 0)

  // Transform to User format
  const users: User[] = (profilesResult.data || []).map((profile: any) => ({
    id: profile.id,
    email: profile.email || "",
    full_name: profile.full_name || "Sem nome",
    role: profile.role || "user",
    company_name: profile.companies?.name,
    company_id: profile.company_id,
    status: "active" as const,
    created_at: profile.created_at,
  }))

  const companies: Company[] = companiesResult.data || []

  return { users, companies }
}

export default async function UsersPage() {
  const { users, companies } = await fetchData()

  return <UsersClient initialUsers={users} companies={companies} />
}
