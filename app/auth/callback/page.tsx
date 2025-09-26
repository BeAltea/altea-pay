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
        // Handle the auth callback from Supabase
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("[v0] Callback - Session error:", error)
          router.push("/auth/login?error=callback_error")
          return
        }

        if (!data.session?.user) {
          router.push("/auth/login")
          return
        }

        // Just redirect to root and let middleware determine the correct dashboard
        router.push("/")
      } catch (error) {
        console.error("[v0] Callback - Error:", error)
        router.push("/auth/login?error=callback_error")
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
