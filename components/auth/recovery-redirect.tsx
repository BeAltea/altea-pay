"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Componente que detecta tokens de recovery no hash da URL e redireciona para a página de reset de senha.
 * Isso é necessário porque o Supabase redireciona para a URL configurada com os tokens no hash,
 * e o hash não é enviado ao servidor (middleware não consegue capturar).
 */
export function RecoveryRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Verifica se há tokens de recovery no hash da URL
    if (typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const type = hashParams.get("type")
      const errorCode = hashParams.get("error_code")
      const errorDescription = hashParams.get("error_description")

      // Se houver erro no token
      if (errorCode || errorDescription) {
        console.log("[v0] Erro no token de recovery:", errorDescription || errorCode)
        router.push("/auth/reset-password?error=" + encodeURIComponent(errorDescription || errorCode || "Token inválido"))
        return
      }

      // Se for um recovery com tokens válidos, redireciona para reset-password
      if (accessToken && type === "recovery") {
        console.log("[v0] Detectado token de recovery, redirecionando para reset-password")
        // Constrói a nova URL com os tokens no hash para a página de reset processar
        const resetUrl = `/auth/reset-password#access_token=${accessToken}&refresh_token=${refreshToken}&type=${type}`
        router.push(resetUrl)
      }
    }
  }, [router])

  return null
}
