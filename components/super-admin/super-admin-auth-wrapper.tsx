"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { SuperAdminSidebar, MobileSuperAdminSidebarContext } from "@/components/super-admin/super-admin-sidebar"
import { SuperAdminHeader } from "@/components/super-admin/super-admin-header"

export function SuperAdminAuthWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    router.push("/auth/login")
    return null
  }

  const role = session.user.role ?? "user"

  if (role !== "super_admin") {
    if (role === "admin") {
      router.push("/dashboard")
    } else if (role === "user") {
      router.push("/user-dashboard")
    } else {
      router.push("/auth/login")
    }
    return null
  }

  // Map NextAuth session to the shape expected by sidebar/header
  const user = {
    id: session.user.id,
    email: session.user.email ?? undefined,
    user_metadata: {
      full_name: session.user.fullName ?? session.user.name ?? undefined,
    },
  }

  return (
    <MobileSuperAdminSidebarContext.Provider value={{ isMobileMenuOpen, setIsMobileMenuOpen }}>
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
    </MobileSuperAdminSidebarContext.Provider>
  )
}
