"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { Building2, Save, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { updateCompany } from "@/app/actions/company-actions"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"

interface CompanyFormData {
  name: string
  cnpj: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
}

export default function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  const [formData, setFormData] = useState<CompanyFormData>({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  })

  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = await params
      setCompanyId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!companyId) return

    async function fetchCompanyData() {
      setIsFetching(true)
      try {
        const supabase = createBrowserClient()

        const { data: company, error } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .single()

        if (error) throw error

        if (company) {
          setFormData({
            name: company.name || "",
            cnpj: company.cnpj || "",
            email: company.email || "",
            phone: company.phone || "",
            address: company.address || "",
            city: company.city || "",
            state: company.state || "",
            zipCode: company.zip_code || "",
          })
        } else {
          toast({
            title: "Erro",
            description: "Empresa não encontrada",
            variant: "destructive",
          })
          router.push("/super-admin/companies")
        }
      } catch (error) {
        console.error("[v0] Error fetching company:", error)
        toast({
          title: "Erro",
          description: "Erro ao carregar dados da empresa",
          variant: "destructive",
        })
      } finally {
        setIsFetching(false)
      }
    }

    fetchCompanyData()
  }, [companyId, router, toast])

  const handleInputChange = (field: keyof CompanyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return

    setIsLoading(true)

    try {
      const result = await updateCompany({
        id: companyId,
        name: formData.name,
        cnpj: formData.cnpj,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipcode: formData.zipCode,
      })

      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Dados da empresa atualizados com sucesso!",
        })
        router.push(`/super-admin/companies/${companyId}`)
      } else {
        toast({
          title: "Erro",
          description: result.message || "Erro ao atualizar empresa",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating company:", error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar empresa",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching || !companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-altea-gold" />
          <p className="text-gray-600 dark:text-gray-400">Carregando dados da empresa...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={`/generic-placeholder-icon.png`} alt={formData.name} />
            <AvatarFallback className="bg-altea-gold/10 text-altea-navy text-lg">
              {formData.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2) || "??"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Editar Empresa</h1>
            <p className="text-gray-600 dark:text-gray-400">{formData.name || "Carregando..."}</p>
          </div>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild variant="outline">
            <Link href={`/super-admin/companies/${companyId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Informações Básicas</span>
            </CardTitle>
            <CardDescription>Dados principais da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => handleInputChange("cnpj", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
                />
              </div>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Informações de localização da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input id="state" value={formData.state} onChange={(e) => handleInputChange("state", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href={`/super-admin/companies/${companyId}`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
