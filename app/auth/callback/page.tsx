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
        console.log("[v0] Callback - Processing auth callback")

        // Get the current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("[v0] Callback - Session error:", sessionError)
          router.push("/auth/login?error=callback_error")
          return
        }

        if (!session?.user) {
          console.log("[v0] Callback - No session found, redirecting to login")
          router.push("/auth/login")
          return
        }

        console.log("[v0] Callback - User authenticated:", session.user.email)

        // Get user profile to determine redirect
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()

        console.log("[v0] Callback - Profile data:", profile, "Error:", profileError)

        if (profileError || !profile) {
          console.log("[v0] Callback - Profile not found, redirecting to login")
          router.push("/auth/login?error=profile_not_found")
          return
        }

        const userRole = profile.role || "user"
        console.log("[v0] Callback - User role:", userRole)

        // Redirect based on role
        if (userRole === "admin") {
          console.log("[v0] Callback - Redirecting admin to dashboard")
          router.push("/dashboard")
        } else {
          console.log("[v0] Callback - Redirecting user to user-dashboard")
          router.push("/user-dashboard")
        }
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
