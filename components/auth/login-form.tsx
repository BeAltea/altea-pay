"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Mail, Lock, ArrowLeft } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        console.log("[v0] Login - User authenticated:", data.user.id)

        console.log("[v0] Login - Redirecting to callback for role determination")
        router.push("/auth/callback")
      }
    } catch (error: unknown) {
      console.error("[v0] Login error:", error)
      setError(error instanceof Error ? error.message : "Erro ao fazer login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-altea-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-white hover:text-altea-gold transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para o site
          </Link>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-altea-gold p-3 rounded-xl">
              <div className="h-8 w-8 bg-altea-navy rounded-sm flex items-center justify-center">
                <span className="text-altea-gold font-bold text-lg">A</span>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">Altea Pay</h1>
          <p className="text-blue-100 mt-2">Sistema de cobrança inteligente</p>
        </div>

        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center text-altea-navy">Entrar na sua conta</CardTitle>
            <CardDescription className="text-center">Digite suas credenciais para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                className="w-full bg-altea-navy hover:bg-altea-navy/90 text-white cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              Não tem uma conta?{" "}
              <Link
                href="/auth/register"
                className="text-altea-navy hover:text-altea-navy/80 font-medium underline underline-offset-4 cursor-pointer"
              >
                Criar conta
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
