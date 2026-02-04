"use client"

import type React from "react"
import { createContext, useContext } from "react"
import { useSession, signOut as nextAuthSignOut, SessionProvider } from "next-auth/react"

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: "super_admin" | "admin" | "user"
  company_id: string | null
}

interface AuthContextType {
  user: { id: string; email: string } | null
  profile: Profile | null
  loading: boolean
  companyId: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const loading = status === "loading"

  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email || "",
      }
    : null

  const profile: Profile | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email || "",
        full_name: session.user.fullName || null,
        role: (session.user.role as "super_admin" | "admin" | "user") || "user",
        company_id: session.user.companyId || null,
      }
    : null

  const handleSignOut = async () => {
    await nextAuthSignOut({ callbackUrl: "/" })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        companyId: profile?.company_id || null,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
