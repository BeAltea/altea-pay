import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminSidebarWrapper } from "@/components/dashboard/admin-sidebar-wrapper"

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

  let userProfile = profile

  if (profileError || !userProfile) {
    console.error("[Dashboard Layout] Profile not found:", profileError)
    if (profileError?.code === "PGRST116") {
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Usuario",
          role: "admin",
        })
        .select("role, company_id, full_name, email")
        .single()

      if (createError || !newProfile) {
        console.error("[Dashboard Layout] Error creating profile:", createError)
        redirect("/auth/login")
      }

      userProfile = newProfile
    } else {
      redirect("/auth/login")
    }
  }

  if (userProfile.role === "super_admin") {
    redirect("/super-admin")
  }

  if (userProfile.role === "user") {
    redirect("/user-dashboard")
  }

  let company = null
  if (userProfile.company_id) {
    const { data: companyData } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", userProfile.company_id)
      .single()

    company = companyData
  }

  const enhancedUser = {
    ...data.user,
    profile: {
      role: userProfile.role,
      company_id: userProfile.company_id,
      full_name: userProfile.full_name,
      company: company,
    },
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--admin-bg-primary)" }}
    >
      <AdminSidebarWrapper user={enhancedUser}>
        {children}
      </AdminSidebarWrapper>
    </div>
  )
}
