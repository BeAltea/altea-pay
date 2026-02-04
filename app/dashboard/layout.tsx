import type React from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { profiles, companies } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/login")
  }

  const [profile] = await db
    .select({
      role: profiles.role,
      companyId: profiles.companyId,
      fullName: profiles.fullName,
      email: profiles.email,
    })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1)

  if (!profile) {
    redirect("/auth/login")
  }

  if (profile.role === "super_admin") {
    redirect("/super-admin")
  }

  let company = null
  if (profile.companyId) {
    const [companyData] = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.id, profile.companyId))
      .limit(1)

    company = companyData ?? null
  }

  const enhancedUser = {
    id: session.user.id,
    email: session.user.email,
    user_metadata: {
      full_name: profile.fullName ?? session.user.name,
    },
    profile: {
      role: profile.role,
      company_id: profile.companyId,
      full_name: profile.fullName,
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
