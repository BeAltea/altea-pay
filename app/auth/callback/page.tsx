"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function AuthCallback() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") return

    if (!session?.user) {
      router.push("/auth/login")
      return
    }

    const role = session.user.role || "user"
    if (role === "super_admin") {
      router.push("/super-admin")
    } else if (role === "admin") {
      router.push("/dashboard")
    } else {
      router.push("/user-dashboard")
    }
  }, [session, status, router])

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
