"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Componente que detecta tokens de recovery na URL e redireciona para a página de reset de senha.
 * Suporta tanto o fluxo PKCE (?code=...) quanto o fluxo implícito (#access_token=...).
 */
export function RecoveryRedirect() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [statusMessage, setStatusMessage] = useState("Redirecionando...")

  useEffect(() => {
    const processAuthParams = async () => {
      if (typeof window === "undefined") return

      const urlParams = new URLSearchParams(window.location.search)
      const hash = window.location.hash
      
      // Verifica se há código PKCE na query string
      const code = urlParams.get("code")
      
      console.log("[RecoveryRedirect] URL params:", { 
        code: code ? "presente" : "ausente",
        hash: hash || "vazio"
      })

      // FLUXO PKCE: código na query string
      if (code) {
        console.log("[RecoveryRedirect] Detectado código PKCE, processando...")
        setIsRedirecting(true)
        setStatusMessage("Verificando código de segurança...")

        try {
          const supabase = createClient()
          
          // Troca o código por uma sessão
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error("[RecoveryRedirect] Erro ao trocar código:", error)
            window.location.href = `/auth/reset-password?error=${encodeURIComponent(error.message)}`
            return
          }

          if (data.session) {
            console.log("[RecoveryRedirect] Sessão criada com sucesso, redirecionando para reset-password")
            // Limpa a URL e redireciona
            window.history.replaceState({}, document.title, window.location.pathname)
            window.location.href = "/auth/reset-password"
            return
          }
        } catch (err) {
          console.error("[RecoveryRedirect] Erro ao processar código PKCE:", err)
          window.location.href = "/auth/reset-password?error=Erro ao processar código de recuperação"
        }
        return
      }

      // FLUXO IMPLÍCITO: tokens no hash
      if (hash && hash.length > 2) {
        try {
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get("access_token")
          const refreshToken = hashParams.get("refresh_token")
          const type = hashParams.get("type")
          const errorCode = hashParams.get("error_code")
          const errorDescription = hashParams.get("error_description")

          console.log("[RecoveryRedirect] Hash params:", { 
            hasAccessToken: !!accessToken, 
            type, 
            errorCode 
          })

          // Se houver erro no token
          if (errorCode || errorDescription) {
            console.log("[RecoveryRedirect] Erro no token:", errorDescription || errorCode)
            setIsRedirecting(true)
            window.location.href = `/auth/reset-password?error=${encodeURIComponent(errorDescription || errorCode || "Token inválido")}`
            return
          }

          // Se for um recovery com tokens válidos
          if (accessToken && type === "recovery") {
            console.log("[RecoveryRedirect] Detectado token de recovery no hash")
            setIsRedirecting(true)
            const resetUrl = `/auth/reset-password#access_token=${accessToken}&refresh_token=${refreshToken || ""}&type=${type}`
            window.location.href = resetUrl
            return
          }
        } catch (error) {
          console.error("[RecoveryRedirect] Erro ao processar hash:", error)
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
