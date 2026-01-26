"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

/**
 * Componente que detecta tokens de recovery no hash da URL e redireciona para a página de reset de senha.
 * Isso é necessário porque o Supabase redireciona para a URL configurada com os tokens no hash,
 * e o hash não é enviado ao servidor (middleware não consegue capturar).
 */
export function RecoveryRedirect() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Função para processar o hash
    const processHash = () => {
      if (typeof window === "undefined") return

      const hash = window.location.hash
      console.log("[RecoveryRedirect] Hash da URL:", hash)
      
      if (!hash || hash.length < 2) return

      try {
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const type = hashParams.get("type")
        const errorCode = hashParams.get("error_code")
        const errorDescription = hashParams.get("error_description")

        console.log("[RecoveryRedirect] Parsed params:", { 
          hasAccessToken: !!accessToken, 
          type, 
          errorCode, 
          errorDescription 
        })

        // Se houver erro no token
        if (errorCode || errorDescription) {
          console.log("[RecoveryRedirect] Erro no token de recovery:", errorDescription || errorCode)
          setIsRedirecting(true)
          router.replace("/auth/reset-password?error=" + encodeURIComponent(errorDescription || errorCode || "Token inválido"))
          return
        }

        // Se for um recovery com tokens válidos, redireciona para reset-password
        if (accessToken && type === "recovery") {
          console.log("[RecoveryRedirect] Detectado token de recovery, redirecionando para reset-password")
          setIsRedirecting(true)
          
          // Usa window.location para garantir que o hash seja preservado
          const resetUrl = `/auth/reset-password#access_token=${accessToken}&refresh_token=${refreshToken || ""}&type=${type}`
          window.location.href = resetUrl
          return
        }
      } catch (error) {
        console.error("[RecoveryRedirect] Erro ao processar hash:", error)
      }
    }

    // Executa imediatamente
    processHash()

    // Também escuta mudanças no hash (caso o hash seja adicionado depois)
    const handleHashChange = () => {
      processHash()
    }

    window.addEventListener("hashchange", handleHashChange)

    return () => {
      window.removeEventListener("hashchange", handleHashChange)
    }
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
          <h1 className="text-xl font-bold text-white mb-2">Redirecionando...</h1>
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
