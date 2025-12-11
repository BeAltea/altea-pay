"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Mail, Lock, User, Building, ArrowLeft, CreditCard } from "lucide-react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [phone, setPhone] = useState("")
  const [personType, setPersonType] = useState<"PF" | "PJ">("PF")
  const [cpfCnpj, setCpfCnpj] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, "")

    if (personType === "PF") {
      // Format CPF: 000.000.000-00
      if (numbers.length <= 11) {
        return numbers
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      }
    } else {
      // Format CNPJ: 00.000.000/0000-00
      if (numbers.length <= 14) {
        return numbers
          .replace(/(\d{2})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1/$2")
          .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
      }
    }

    return value
  }

  const validateCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, "")

    if (personType === "PF") {
      return numbers.length === 11
    } else {
      return numbers.length === 14
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
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

    if (!validateCpfCnpj(cpfCnpj)) {
      setError(`${personType === "PF" ? "CPF" : "CNPJ"} inválido. Verifique o formato.`)
      setIsLoading(false)
      return
    }

    try {
      console.log("[v0] 🚀 Iniciando processo de registro")

      const supabase = createClient()
      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, "")
      const formattedCpfCnpj = cpfCnpj

      console.log("[v0] 📋 Dados do registro:", {
        email,
        cpf_cnpj_clean: cleanCpfCnpj,
        cpf_cnpj_formatted: formattedCpfCnpj,
        person_type: personType,
        phone,
      })

      console.log("[v0] 🔍 PASSO 1: Buscando na tabela companies...")

      const { data: foundCompany, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .or(`cnpj.eq.${cleanCpfCnpj},cnpj.eq.${formattedCpfCnpj},email.eq.${email}`)
        .maybeSingle()

      console.log("[v0] 📊 Resultado da busca companies:", {
        encontrou: !!foundCompany,
        empresa_nome: foundCompany?.name,
        tem_erro: !!companyError,
      })

      let role = "user"
      let companyId = null
      let detectedCompanyName = companyName || "Sem empresa"
      let requiresEmailVerification = true
      let foundInCustomerTable = null

      if (foundCompany) {
        // É um admin de empresa
        role = "admin"
        companyId = foundCompany.id
        detectedCompanyName = foundCompany.name
        requiresEmailVerification = false

        console.log("[v0] 🎉 USUÁRIO É ADMIN DA EMPRESA:", {
          empresa_nome: detectedCompanyName,
          empresa_id: companyId,
        })
      } else {
        console.log("[v0] 🔍 PASSO 2: Buscando cliente em TODAS as tabelas do banco...")

        try {
          const response = await fetch("/api/find-in-all-tables", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cpfCnpj: formattedCpfCnpj }),
          })

          const searchResult = await response.json()

          if (searchResult.found) {
            foundInCustomerTable = {
              company_id: searchResult.company_id,
              company_name: searchResult.company_name,
              table_name: searchResult.table,
              customer_data: searchResult.data,
            }

            companyId = searchResult.company_id
            detectedCompanyName = searchResult.company_name

            console.log("[v0] 🎉 CLIENTE ENCONTRADO!", {
              empresa: detectedCompanyName,
              tabela: searchResult.table,
              coluna: searchResult.column_used,
            })
          } else {
            console.log("[v0] ℹ️ Cliente não encontrado em nenhuma tabela do banco")
          }
        } catch (apiError) {
          console.error("[v0] ❌ Erro ao buscar em todas as tabelas:", apiError)
        }
      }

      console.log("[v0] 🔐 Criando conta no Supabase Auth:", {
        email,
        role,
        company_id: companyId,
        company_name: detectedCompanyName,
        requires_verification: requiresEmailVerification,
        found_in_customer_table: !!foundInCustomerTable,
      })

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName.trim(),
            company_name: detectedCompanyName,
            company_id: companyId,
            role: role,
            cpf_cnpj: formattedCpfCnpj,
            person_type: personType,
            requires_email_verification: requiresEmailVerification,
            phone: phone,
            customer_table_name: foundInCustomerTable?.table_name || null,
          },
        },
      })

      if (error) {
        console.error("[v0] ❌ Erro ao criar conta:", error)
        throw error
      }

      console.log("[v0] ✅ Conta criada com sucesso!", {
        user_id: data.user?.id,
        email: data.user?.email,
        role: role,
        company_id: companyId,
      })

      if (data.user?.id) {
        console.log("[v0] 💾 Salvando dados no perfil do usuário...")

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            company_id: companyId,
            role: role,
            phone: phone,
            cpf_cnpj: formattedCpfCnpj,
          })
          .eq("id", data.user.id)

        if (profileError) {
          console.error("[v0] ❌ Erro ao atualizar perfil:", profileError)
        } else {
          console.log("[v0] ✅ Perfil atualizado com sucesso")
        }
      }

      router.push("/auth/register-success")
    } catch (error: unknown) {
      console.error("[v0] ❌ Falha no registro:", error)
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
              Criar sua conta
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base">
              Preencha os dados para começar a usar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleRegister} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo de Pessoa</Label>
                <RadioGroup
                  value={personType}
                  onValueChange={(value) => {
                    setPersonType(value as "PF" | "PJ")
                    setCpfCnpj("") // Clear CPF/CNPJ when changing type
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PF" id="pf" />
                    <Label htmlFor="pf" className="cursor-pointer font-normal">
                      Pessoa Física (CPF)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PJ" id="pj" />
                    <Label htmlFor="pj" className="cursor-pointer font-normal">
                      Pessoa Jurídica (CNPJ)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpfCnpj" className="text-sm font-medium">
                  {personType === "PF" ? "CPF" : "CNPJ"}
                </Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="cpfCnpj"
                    type="text"
                    placeholder={personType === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy h-10 sm:h-11 text-sm sm:text-base"
                    required
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                    maxLength={personType === "PF" ? 14 : 18}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4">
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
                      className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy h-10 sm:h-11 text-sm sm:text-base"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>
                {personType === "PJ" && (
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
                        className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy h-10 sm:h-11 text-sm sm:text-base"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Telefone
                </Label>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-3 h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    className="pl-10 border-gray-300 focus:border-altea-navy focus:ring-altea-navy h-10 sm:h-11 text-sm sm:text-base"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
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
                  Confirmar senha
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
                {isLoading ? "Criando conta..." : "Criar conta"}
              </Button>
            </form>
            <div className="mt-4 sm:mt-6 text-center text-sm">
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
