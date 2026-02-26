"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Mail, Lock, User, ArrowLeft, CreditCard, Phone } from "lucide-react"

export default function PortalRegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [documentType, setDocumentType] = useState<"cpf" | "cnpj">("cpf")
  const [documentNumber, setDocumentNumber] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11)
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
  }

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 14)
    if (numbers.length <= 2) return numbers
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12)}`
  }

  const handleDocumentChange = (value: string) => {
    if (documentType === "cpf") {
      setDocumentNumber(formatCPF(value))
    } else {
      setDocumentNumber(formatCNPJ(value))
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError("As senhas nao coincidem")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/portal/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          document_type: documentType,
          document_number: documentNumber.replace(/\D/g, ""),
          phone: phone || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Erro ao criar conta")
        return
      }

      setSuccess("Conta criada com sucesso! Redirecionando para o login...")

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Erro de conexao")
    } finally {
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
          <p className="text-blue-100 mt-1 sm:mt-2 text-sm sm:text-base">Portal do Cliente</p>
        </div>

        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="space-y-1 pb-4 sm:pb-6 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl font-semibold text-center text-altea-navy">
              Criar sua conta
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base">
              Cadastre-se para consultar suas dividas e realizar pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleRegister} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo de Documento</Label>
                <RadioGroup
                  value={documentType}
                  onValueChange={(value) => {
                    setDocumentType(value as "cpf" | "cnpj")
                    setDocumentNumber("")
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cpf" id="cpf" />
                    <Label htmlFor="cpf" className="cursor-pointer font-normal">
                      CPF (Pessoa Fisica)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cnpj" id="cnpj" />
                    <Label htmlFor="cnpj" className="cursor-pointer font-normal">
                      CNPJ (Pessoa Juridica)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentNumber" className="text-sm font-medium">
                  {documentType === "cpf" ? "CPF" : "CNPJ"}
                </Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="documentNumber"
                    type="text"
                    placeholder={documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy h-10 sm:h-11 text-sm sm:text-base"
                    required
                    value={documentNumber}
                    onChange={(e) => handleDocumentChange(e.target.value)}
                    maxLength={documentType === "cpf" ? 14 : 18}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Nome Completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome completo"
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy h-10 sm:h-11 text-sm sm:text-base"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
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
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy h-10 sm:h-11 text-sm sm:text-base"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Telefone (opcional)
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy h-10 sm:h-11 text-sm sm:text-base"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                    placeholder="Minimo 6 caracteres"
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy h-10 sm:h-11 text-sm sm:text-base"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirme sua senha"
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

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-altea-navy hover:bg-altea-navy/90 text-white cursor-pointer h-10 sm:h-11 text-sm sm:text-base"
                disabled={isLoading}
              >
                {isLoading ? "Criando conta..." : "Criar conta"}
              </Button>
            </form>
            <div className="mt-4 sm:mt-6 text-center text-sm">
              Ja tem uma conta?{" "}
              <Link
                href="/auth/login"
                className="text-altea-navy hover:text-altea-navy/80 font-medium underline underline-offset-4 cursor-pointer"
              >
                Entrar
              </Link>
            </div>
            <div className="mt-2 text-center text-sm text-gray-500">
              Deseja registrar uma empresa?{" "}
              <Link
                href="/auth/register"
                className="text-altea-navy hover:text-altea-navy/80 font-medium underline underline-offset-4 cursor-pointer"
              >
                Registro empresarial
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
