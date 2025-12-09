import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  let data, error
  let retries = 3

  while (retries > 0) {
    const result = await supabase.auth.getUser()
    data = result.data
    error = result.error

    if (!error || error.message !== "Failed to fetch") {
      break
    }

    retries--

    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, company_id, full_name, email")
    .eq("id", data.user.id)
    .single()

  if (profileError || !profile) {
    console.error("[v0] Dashboard Layout - Profile not found:", profileError)
    if (profileError?.code === "PGRST116") {
      // No rows returned
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Usuário",
          role: "user", // Role padrão
        })
        .select("role, company_id, full_name, email")
        .single()

      if (createError) {
        console.error("[v0] Dashboard Layout - Erro ao criar perfil:", createError)
        redirect("/auth/login")
      }

      // Usar o perfil recém-criado
      profile.role = newProfile?.role || "user"
      profile.company_id = newProfile?.company_id
      profile.full_name = newProfile?.full_name
      profile.email = newProfile?.email
    } else {
      redirect("/auth/login")
    }
  }

  if (profile.role === "super_admin") {
    redirect("/super-admin")
  }

  let company = null
  if (profile.company_id) {
    const { data: companyData } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", profile.company_id)
      .single()

    company = companyData
  }

  const enhancedUser = {
    ...data.user,
    profile: {
      role: profile.role,
      company_id: profile.company_id,
      full_name: profile.full_name,
      company: company,
    },
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
        <Sidebar user={enhancedUser} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header user={enhancedUser} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
