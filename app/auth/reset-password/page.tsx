"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"
import { Lock, CheckCircle, AlertCircle } from "lucide-react"
import { resetPasswordAction } from "@/app/actions/auth-actions"

function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  if (!token) {
    return (
      <div className="min-h-screen bg-altea-navy flex items-center justify-center p-3 sm:p-4 lg:p-6">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <div className="bg-altea-gold p-2 sm:p-3 rounded-xl">
                <div className="h-6 w-6 sm:h-8 sm:w-8 bg-altea-navy rounded-sm flex items-center justify-center">
                  <span className="text-altea-gold font-bold text-sm sm:text-lg">A</span>
                </div>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Altea Pay</h1>
          </div>

          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-semibold text-center text-altea-navy">
                Link inválido ou expirado
              </CardTitle>
              <CardDescription className="text-center text-sm sm:text-base">
                O link de recuperação de senha é inválido ou já expirou. Por favor, solicite um novo link.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 space-y-3">
              <Link href="/auth/forgot-password">
                <Button
                  className="w-full bg-altea-navy hover:bg-altea-navy/90 text-white cursor-pointer h-10 sm:h-11 text-sm sm:text-base"
                >
                  Solicitar novo link
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  className="w-full cursor-pointer h-10 sm:h-11 text-sm sm:text-base"
                >
                  Voltar para o login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      setIsLoading(false)
      return
    }

    try {
      const result = await resetPasswordAction(token, password)

      if (!result.success) {
        setError(result.error || "Erro ao atualizar senha")
        setIsLoading(false)
        return
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.push("/auth/login")
      }, 3000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Erro ao atualizar senha")
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-altea-navy flex items-center justify-center p-3 sm:p-4 lg:p-6">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <div className="bg-altea-gold p-2 sm:p-3 rounded-xl">
                <div className="h-6 w-6 sm:h-8 sm:w-8 bg-altea-navy rounded-sm flex items-center justify-center">
                  <span className="text-altea-gold font-bold text-sm sm:text-lg">A</span>
                </div>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Altea Pay</h1>
          </div>

          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-semibold text-center text-altea-navy">
                Senha atualizada!
              </CardTitle>
              <CardDescription className="text-center text-sm sm:text-base">
                Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <Link href="/auth/login">
                <Button
                  className="w-full bg-altea-navy hover:bg-altea-navy/90 text-white cursor-pointer h-10 sm:h-11 text-sm sm:text-base"
                >
                  Ir para o login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-altea-navy flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="bg-altea-gold p-2 sm:p-3 rounded-xl">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-altea-navy rounded-sm flex items-center justify-center">
                <span className="text-altea-gold font-bold text-sm sm:text-lg">A</span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Altea Pay</h1>
          <p className="text-blue-100 mt-1 sm:mt-2 text-sm sm:text-base">Sistema de cobrança inteligente</p>
        </div>

        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl font-semibold text-center text-altea-navy">
              Criar nova senha
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base">
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleResetPassword} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy h-10 sm:h-11 text-sm sm:text-base"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy h-10 sm:h-11 text-sm sm:text-base"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <Button
                type="submit"
                className="w-full bg-altea-navy hover:bg-altea-navy/90 text-white cursor-pointer h-10 sm:h-11 text-sm sm:text-base"
                disabled={isLoading}
              >
                {isLoading ? "Atualizando..." : "Atualizar senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-altea-navy flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-altea-gold"></div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
