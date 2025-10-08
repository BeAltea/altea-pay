"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { createContext, useContext, useEffect, useState } from "react"

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  company_name: string | null
  role: string | null
  company_id: string | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  isSuperAdmin: boolean
  isAdmin: boolean
  isUser: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  isSuperAdmin: false,
  isAdmin: false,
  isUser: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        }
      } catch (error) {
        console.error("Error getting initial session:", error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error("Error in auth state change:", error)
      } finally {
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, company_name, role, company_id")
        .eq("id", userId)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          console.warn("Profile not found for user:", userId)
          return
        }
        console.error("Error fetching profile:", error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error("Exception fetching profile:", error)
    }
  }

  const signOut = async () => {
    try {
      console.log("[v0] useAuth - Starting signOut process")
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("[v0] useAuth - SignOut error:", error)
        throw error
      }

      setUser(null)
      setProfile(null)
      console.log("[v0] useAuth - SignOut successful, redirecting...")

      // Force redirect to login page
      window.location.href = "/auth/login"
    } catch (error) {
      console.error("[v0] useAuth - SignOut exception:", error)
      throw error
    }
  }

  const isSuperAdmin = profile?.role === "super_admin"
  const isAdmin = profile?.role === "admin"
  const isUser = profile?.role === "user"

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signOut,
        isSuperAdmin,
        isAdmin,
        isUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
