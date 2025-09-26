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

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      role,
      company_id,
      full_name,
      companies (
        id,
        name,
        subscription_plan
      )
    `)
    .eq("id", data.user.id)
    .single()

  if (profileError || !profile) {
    console.error("Profile not found:", profileError)
    redirect("/auth/login")
  }

  if (profile.role === "super_admin") {
    redirect("/super-admin")
  }

  const enhancedUser = {
    ...data.user,
    profile: {
      role: profile.role,
      company_id: profile.company_id,
      full_name: profile.full_name,
      company: profile.companies,
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
