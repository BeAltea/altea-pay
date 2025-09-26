"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log("[v0] Callback iniciado")
      const supabase = createClient()

      try {
        const { data, error } = await supabase.auth.getSession()
        console.log("[v0] Sessão obtida:", { user: data.session?.user?.email, error })

        if (error || !data.session?.user) {
          console.log("[v0] Erro ou usuário não encontrado, redirecionando para login")
          router.push("/auth/login")
          return
        }

        const userId = data.session.user.id
        console.log("[v0] Buscando perfil para usuário:", userId)

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, company_id")
          .eq("id", userId)
          .single()

        console.log("[v0] Perfil encontrado:", { profile, profileError })

        if (profileError || !profile) {
          console.log("[v0] Perfil não encontrado, criando perfil básico")
          const { error: insertError } = await supabase.from("profiles").insert({
            id: userId,
            email: data.session.user.email,
            role: "user",
            full_name: data.session.user.user_metadata?.full_name || null,
            company_id: null, // Will be assigned later by super admin
          })

          if (insertError) {
            console.error("[v0] Erro ao criar perfil:", insertError)
          }

          console.log("[v0] Redirecionando usuário para dashboard de usuário")
          router.push("/user-dashboard")
          return
        }

        if (profile.role === "super_admin") {
          console.log("[v0] Redirecionando super admin para painel Altea")
          router.push("/super-admin")
        } else if (profile.role === "admin") {
          console.log("[v0] Redirecionando admin para dashboard administrativo")
          router.push("/dashboard")
        } else {
          console.log("[v0] Redirecionando usuário para dashboard de usuário")
          router.push("/user-dashboard")
        }
      } catch (error) {
        console.error("[v0] Erro no callback:", error)
        router.push("/auth/login")
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-altea-navy flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-altea-gold p-3 rounded-xl">
            <div className="h-8 w-8 bg-altea-navy rounded-sm flex items-center justify-center">
              <span className="text-altea-gold font-bold text-lg">A</span>
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Processando login...</h1>
        <p className="text-blue-100">Aguarde enquanto redirecionamos você.</p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-altea-gold mx-auto"></div>
        </div>
      </div>
    </div>
  )
}
