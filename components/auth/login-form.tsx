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
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("[v0] Erro no login:", error)
        throw error
      }

      if (data.user) {
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, company_id")
          .eq("id", data.user.id)
          .single()

        if (profileError || !profile) {
          // Check if this is a final_client before creating profile
          const isFinalClient = data.user.user_metadata?.role === "final_client"

          // Also check final_clients table
          const { data: finalClientRecord } = await supabase
            .from("final_clients")
            .select("id")
            .eq("user_id", data.user.id)
            .maybeSingle()

          if (isFinalClient || finalClientRecord) {
            // Final clients don't need a profiles record, redirect to portal
            router.push("/portal")
            router.refresh()
            return
          }

          const { error: insertError } = await supabase.from("profiles").insert({
            id: data.user.id,
            email: data.user.email,
            role: "user",
            full_name: data.user.user_metadata?.full_name || null,
            company_id: null,
          })

          if (insertError) {
            console.error("[v0] Erro ao criar perfil:", insertError)
            setError("Erro ao criar perfil do usuário")
            return
          }

          router.push("/user-dashboard")
          router.refresh()
          return
        }

        // Check if user is a final_client (via user_metadata or final_clients table)
        const isFinalClient = data.user.user_metadata?.role === "final_client"

        if (isFinalClient) {
          router.push("/portal")
          router.refresh()
        } else if (profile.role === "super_admin") {
          router.push("/super-admin")
          router.refresh()
        } else if (profile.role === "admin") {
          router.push("/dashboard")
          router.refresh()
        } else {
          // Check if there's a final_clients record for this user
          const { data: finalClientRecord } = await supabase
            .from("final_clients")
            .select("id")
            .eq("user_id", data.user.id)
            .maybeSingle()

          if (finalClientRecord) {
            router.push("/portal")
            router.refresh()
          } else {
            router.push("/user-dashboard")
            router.refresh()
          }
        }
      }
    } catch (error: unknown) {
      console.error("[v0] Erro no processo de login:", error)
      setError(error instanceof Error ? error.message : "Erro ao fazer login")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-altea-navy flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-white hover:text-altea-gold transition-colors mb-4 sm:mb-6 cursor-pointer text-sm sm:text-base"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Voltar para o site
          </Link>
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
              Entrar na sua conta
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base">
              Digite suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
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
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy h-10 sm:h-11 text-sm sm:text-base"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs sm:text-sm text-altea-navy hover:text-altea-navy/80 font-medium underline underline-offset-4 cursor-pointer"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
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
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
            <div className="mt-4 sm:mt-6 text-center text-sm">
              Nao tem uma conta?{" "}
              <Link
                href="/auth/register"
                className="text-altea-navy hover:text-altea-navy/80 font-medium underline underline-offset-4 cursor-pointer"
              >
                Criar conta
              </Link>
            </div>
            <div className="mt-2 text-center text-sm text-gray-500">
              Possui dividas conosco?{" "}
              <Link
                href="/auth/portal-register"
                className="text-altea-navy hover:text-altea-navy/80 font-medium underline underline-offset-4 cursor-pointer"
              >
                Portal do Cliente
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
