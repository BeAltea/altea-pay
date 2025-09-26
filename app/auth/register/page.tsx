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
import { Mail, Lock, User, Building, ArrowLeft } from "lucide-react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
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
      console.log("[v0] Starting user registration process")

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            company_name: companyName,
          },
        },
      })

      console.log("[v0] Registration response:", { data, error })

      if (error) {
        console.error("[v0] Registration error:", error)
        throw error
      }

      if (data.user) {
        console.log("[v0] User created successfully:", data.user.id)
        router.push("/auth/register-success")
      } else {
        throw new Error("Usuário não foi criado corretamente")
      }
    } catch (error: unknown) {
      console.error("[v0] Registration failed:", error)
      if (error instanceof Error) {
        if (error.message.includes("User already registered")) {
          setError("Este email já está cadastrado. Tente fazer login.")
        } else if (error.message.includes("Invalid email")) {
          setError("Email inválido. Verifique o formato do email.")
        } else if (error.message.includes("Password")) {
          setError("Erro na senha. Verifique se atende aos requisitos.")
        } else {
          setError(`Erro ao criar conta: ${error.message}`)
        }
      } else {
        setError("Erro desconhecido ao criar conta. Tente novamente.")
      }
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
            <CardTitle className="text-2xl font-semibold text-center text-altea-navy">Criar sua conta</CardTitle>
            <CardDescription className="text-center">Preencha os dados para começar a usar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">
                    Nome completo
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Seu nome completo"
                      className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-medium">
                    Nome da empresa
                  </Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Nome da sua empresa"
                      className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy"
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
                className="w-full bg-altea-navy hover:bg-altea-navy/90 text-white cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? "Criando conta..." : "Criar conta"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              Já tem uma conta?{" "}
              <Link
                href="/auth/login"
                className="text-altea-navy hover:text-altea-navy/80 font-medium underline underline-offset-4 cursor-pointer"
              >
                Entrar
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
