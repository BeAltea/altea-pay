"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient()

      try {
        const { data, error } = await supabase.auth.getSession()

        if (error || !data.session?.user) {
          router.push("/auth/login")
          return
        }

        const userId = data.session.user.id
        const userMetadata = data.session.user.user_metadata

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, company_id, cpf_cnpj, email")
          .eq("id", userId)
          .single()

        if (profileError || !profile) {
          // Profile not found, create it from user metadata
          await supabase.from("profiles").insert({
            id: userId,
            email: data.session.user.email,
            role: userMetadata?.role || "user",
            full_name: userMetadata?.full_name || null,
            company_id: userMetadata?.company_id || null,
            cpf_cnpj: userMetadata?.cpf_cnpj || null,
            person_type: userMetadata?.person_type || null,
          })

          if (userMetadata?.role === "admin") {
            router.push("/dashboard")
          } else {
            router.push("/user-dashboard")
          }
          return
        }

        if (profile.role === "super_admin") {
          router.push("/super-admin")
        } else if (profile.role === "admin") {
          router.push("/dashboard")
        } else {
          router.push("/user-dashboard")
        }
      } catch {
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
