"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Componente que detecta APENAS tokens de RECOVERY (recuperação de senha) na URL.
 * NÃO deve interceptar tokens de confirmação de email (signup).
 */
export function RecoveryRedirect() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [statusMessage, setStatusMessage] = useState("Redirecionando...")

  useEffect(() => {
    const processAuthParams = async () => {
      if (typeof window === "undefined") return

      const hash = window.location.hash
      
      // APENAS processa tokens no HASH que são explicitamente de RECOVERY
      // NÃO intercepta códigos PKCE na query string - esses são para confirmação de email
      if (hash && hash.length > 2) {
        try {
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get("access_token")
          const refreshToken = hashParams.get("refresh_token")
          const type = hashParams.get("type")
          const errorCode = hashParams.get("error_code")
          const errorDescription = hashParams.get("error_description")

          // IMPORTANTE: Só processa se o type for EXPLICITAMENTE "recovery"
          if (type !== "recovery") {
            return // Não é recovery, deixa o fluxo normal continuar
          }

          // Se houver erro no token de recovery
          if (errorCode || errorDescription) {
            setIsRedirecting(true)
            window.location.href = `/auth/reset-password?error=${encodeURIComponent(errorDescription || errorCode || "Token inválido")}`
            return
          }

          // Se for um recovery com tokens válidos
          if (accessToken && type === "recovery") {
            setIsRedirecting(true)
            const resetUrl = `/auth/reset-password#access_token=${accessToken}&refresh_token=${refreshToken || ""}&type=${type}`
            window.location.href = resetUrl
            return
          }
        } catch (error) {
          // Silently ignore parsing errors
        }
      }
    }

    processAuthParams()
  }, [router])

  // Mostra loading se estiver redirecionando
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
