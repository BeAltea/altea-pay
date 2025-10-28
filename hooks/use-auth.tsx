"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: "super_admin" | "admin" | "user"
  company_id: string | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  companyId: string | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchingRef = useRef(false)
  const lastFetchRef = useRef<number>(0)

  useEffect(() => {
    const fetchUser = async () => {
      if (fetchingRef.current) {
        console.log("[v0] useAuth - Fetch já em andamento, pulando")
        return
      }

      const now = Date.now()
      if (now - lastFetchRef.current < 1000) {
        console.log("[v0] useAuth - Debounce ativo, pulando fetch")
        return
      }

      fetchingRef.current = true
      lastFetchRef.current = now

      try {
        console.log("[v0] useAuth - Fetching user")

        const {
          data: { user: authUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !authUser) {
          console.log("[v0] useAuth - No user found")
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        console.log("[v0] useAuth - User found:", authUser.id)
        setUser(authUser)

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name, role, company_id")
          .eq("id", authUser.id)
          .single()

        if (profileError) {
          console.error("[v0] useAuth - Profile error:", profileError)
          setProfile(null)
        } else {
          console.log("[v0] useAuth - Profile loaded:", profileData)
          setProfile(profileData)
        }
      } catch (error) {
        console.error("[v0] useAuth - Error:", error)
      } finally {
        setLoading(false)
        fetchingRef.current = false
      }
    }

    fetchUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        lastFetchRef.current = 0
        fetchUser()
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    console.log("[v0] Auth - Signing out")
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        companyId: profile?.company_id || null,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
