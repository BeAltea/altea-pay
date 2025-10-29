"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
import { SuperAdminSidebar } from "@/components/super-admin/super-admin-sidebar"
import { SuperAdminHeader } from "@/components/super-admin/super-admin-header"

export function SuperAdminAuthWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          router.push("/auth/login")
          return
        }

        // Check if user has 'super_admin' role
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, company_id")
          .eq("id", user.id)
          .single()

        if (profileError || profile?.role !== "super_admin") {
          // Redirect based on role
          if (profile?.role === "admin") {
            router.push("/dashboard")
          } else if (profile?.role === "user") {
            router.push("/user-dashboard")
          } else {
            router.push("/auth/login")
          }
          return
        }

        setUser(user)
      } catch (error) {
        console.error("[v0] Auth error:", error)
        router.push("/auth/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
        <SuperAdminSidebar user={user} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <SuperAdminHeader user={user} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
