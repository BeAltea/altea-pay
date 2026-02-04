"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

/**
 * Component that detects password recovery tokens in the URL and redirects to the reset password page.
 * Supports both query string tokens (NextAuth style) and legacy hash tokens (for backwards compatibility).
 */
export function RecoveryRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [statusMessage, setStatusMessage] = useState("Redirecionando...")

  useEffect(() => {
    const processAuthParams = () => {
      if (typeof window === "undefined") return

      // Check for token in query string (NextAuth style)
      const queryToken = searchParams.get("token")
      const queryType = searchParams.get("type")

      if (queryToken && queryType === "recovery") {
        setIsRedirecting(true)
        router.replace(`/auth/reset-password?token=${encodeURIComponent(queryToken)}`)
        return
      }

      // Legacy support: Check for tokens in hash (Supabase style)
      // This handles any old recovery links that may still be in use
      const hash = window.location.hash

      if (hash && hash.length > 2) {
        try {
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get("access_token")
          const type = hashParams.get("type")
          const errorCode = hashParams.get("error_code")
          const errorDescription = hashParams.get("error_description")

          // Only process if the type is explicitly "recovery"
          if (type !== "recovery") {
            return // Not a recovery flow, let normal flow continue
          }

          // If there's an error in the recovery token
          if (errorCode || errorDescription) {
            setIsRedirecting(true)
            router.replace(`/auth/reset-password?error=${encodeURIComponent(errorDescription || errorCode || "Token inválido")}`)
            return
          }

          // If it's a recovery with valid tokens, redirect to reset password page
          // Note: Legacy hash tokens may not work with the new NextAuth flow,
          // but we redirect anyway to show the appropriate error message
          if (accessToken && type === "recovery") {
            setIsRedirecting(true)
            router.replace(`/auth/reset-password?token=${encodeURIComponent(accessToken)}`)
            return
          }
        } catch {
          // Silently ignore parsing errors
        }
      }
    }

    processAuthParams()
  }, [router, searchParams])

  // Show loading if redirecting
  if (isRedirecting) {
    return (
      <div className="fixed inset-0 bg-altea-navy flex items-center justify-center z-50">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-altea-gold p-3 rounded-xl">
              <div className="h-8 w-8 bg-altea-navy rounded-sm flex items-center justify-center">
                <span className="text-altea-gold font-bold text-lg">A</span>
              </div>
            </div>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{statusMessage}</h1>
          <p className="text-blue-100">Aguarde enquanto processamos sua solicitação.</p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-altea-gold mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
