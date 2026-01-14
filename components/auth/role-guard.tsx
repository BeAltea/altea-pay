"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface RoleGuardProps {
  children: React.ReactNode
  requiredRole?: "admin" | "user"
  fallback?: React.ReactNode
}

export function RoleGuard({ children, requiredRole = "user", fallback }: RoleGuardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient()

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

        setUserRole(profile?.role || "user")
      }

      setLoading(false)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(getUser)
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div>Carregando...</div>
  }

  if (!user) {
    return fallback || <div>Acesso negado. Faça login.</div>
  }

  if (requiredRole === "admin" && userRole !== "admin") {
    return fallback || <div>Acesso negado. Apenas administradores.</div>
  }

  return <>{children}</>
}
