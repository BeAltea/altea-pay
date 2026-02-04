import type React from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { profiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { UserSidebar } from "@/components/user-dashboard/user-sidebar"
import { UserHeader } from "@/components/user-dashboard/user-header"

export default async function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/login")
  }

  const [profile] = await db
    .select({ role: profiles.role, fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1)

  if (profile?.role !== "user") {
    redirect(profile?.role === "admin" ? "/dashboard" : "/auth/login")
  }

  const user = {
    id: session.user.id,
    email: session.user.email,
    user_metadata: {
      full_name: profile.fullName ?? session.user.name,
    },
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
        <UserSidebar user={user} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <UserHeader user={user} />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="animate-in fade-in duration-200">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
