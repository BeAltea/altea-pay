"use client"

import type React from "react"
import { useAuth } from "@/hooks/use-auth"

interface RoleGuardProps {
  children: React.ReactNode
  requiredRole?: "admin" | "user" | "super_admin"
  fallback?: React.ReactNode
}

export function RoleGuard({ children, requiredRole = "user", fallback }: RoleGuardProps) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <div>Carregando...</div>
  }

  if (!user) {
    return fallback || <div>Acesso negado. Faça login.</div>
  }

  if (requiredRole === "admin" && profile?.role !== "admin" && profile?.role !== "super_admin") {
    return fallback || <div>Acesso negado. Apenas administradores.</div>
  }

  if (requiredRole === "super_admin" && profile?.role !== "super_admin") {
    return fallback || <div>Acesso negado. Apenas super administradores.</div>
  }

  return <>{children}</>
}
