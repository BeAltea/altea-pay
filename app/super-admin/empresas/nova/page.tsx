"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Building2 } from "lucide-react"
import Link from "next/link"
import { createCompanyWithCustomers } from "@/app/actions/company-actions"
import { useToast } from "@/hooks/use-toast"
import { ImportBaseWizard } from "@/components/super-admin/import-base-wizard"

export default function NovaEmpresaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showImportWizard, setShowImportWizard] = useState(false)
  const [importedData, setImportedData] = useState<any[] | null>(null)
  const [companyData, setCompanyData] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      setCompanyData({
        name: formData.get("name"),
        document: formData.get("document"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        address: formData.get("address"),
        status: formData.get("status"),
      })

      setShowImportWizard(true)
      setLoading(false)
    } catch (error) {
      console.error("[v0] Error creating company:", error)
      toast({
        title: "Erro ao criar empresa",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  const handleImportComplete = async (data: any[]) => {
    console.log("[v0] ===== handleImportComplete CHAMADO =====")
    console.log("[v0] Dados recebidos:", data?.length, "clientes")
    console.log("[v0] Company data:", companyData)

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("name", companyData.name)
      formData.append("cnpj", companyData.document)
      formData.append("email", companyData.email || "")
      formData.append("phone", companyData.phone || "")
      formData.append("address", companyData.address || "")
      formData.append("status", companyData.status)

      console.log("[v0] Chamando createCompanyWithCustomers...")
      const result = await createCompanyWithCustomers(formData, data)
      console.log("[v0] Resultado:", result)

      if (result.success) {
        if (result.data?.company?.id) {
          console.log("[v0] Verificando dados salvos no banco...")
          try {
            const verifyResponse = await fetch(`/api/verify-company?id=${result.data.company.id}`)
            const verifyData = await verifyResponse.json()
            console.log("[v0] ===== DADOS REAIS NO BANCO =====")
            console.log("[v0] Empresa ID:", result.data.company.id)
            console.log("[v0] Clientes no banco:", verifyData.customersCount)
            console.log("[v0] Dividas no banco:", verifyData.debtsCount)
            console.log("[v0] Primeiros clientes:", verifyData.customers)
            console.log("[v0] Primeiras dividas:", verifyData.debts)
            console.log("[v0] ===================================")
          } catch (verifyError) {
            console.error("[v0] Erro ao verificar dados:", verifyError)
          }
        }

        toast({
          title: "Empresa criada com sucesso!",
          description: result.message,
        })
        console.log("[v0] Redirecionando para /super-admin/empresas")
        router.push("/super-admin/empresas")
        router.refresh()
      } else {
        console.error("[v0] Erro ao criar empresa:", result)
        toast({
          title: "Erro ao criar empresa",
          description: result.error || result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] ERRO FATAL em handleImportComplete:", error)
      toast({
        title: "Erro ao criar empresa",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSkipImport = async () => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("name", companyData.name)
      formData.append("cnpj", companyData.document)
      formData.append("email", companyData.email || "")
      formData.append("phone", companyData.phone || "")
      formData.append("address", companyData.address || "")
      formData.append("status", companyData.status)

      const result = await createCompanyWithCustomers(formData, undefined)

      if (result.success) {
        toast({
          title: "Empresa criada com sucesso!",
          description: "Você pode importar clientes depois.",
        })
        router.push("/super-admin/empresas")
      } else {
        toast({
          title: "Erro ao criar empresa",
          description: result.error || result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating company:", error)
      toast({
        title: "Erro ao criar empresa",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (showImportWizard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowImportWizard(false)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Importar Base de Clientes</h1>
            <p className="text-muted-foreground">
              Empresa: <span className="font-medium">{companyData.name}</span>
            </p>
          </div>
        </div>

        <ImportBaseWizard companyId={null} onComplete={handleImportComplete} onSkip={handleSkipImport} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/empresas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nova Empresa</h1>
          <p className="text-muted-foreground">Crie uma nova empresa e importe a base de clientes</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações da Empresa
            </CardTitle>
            <CardDescription>Preencha os dados básicos da empresa cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input id="name" name="name" placeholder="Ex: Empresa ABC Ltda" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">CNPJ *</Label>
                <Input id="document" name="document" placeholder="00.000.000/0000-00" required />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="contato@empresa.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" placeholder="(11) 99999-9999" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Textarea id="address" name="address" placeholder="Rua, número, bairro, cidade - UF" rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue="active">
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                  <SelectItem value="suspended">Suspensa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/super-admin/empresas">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Processando..." : "Continuar para Importação"}
          </Button>
        </div>
      </form>
    </div>
  )
}
