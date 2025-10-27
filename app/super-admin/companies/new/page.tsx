"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { ArrowLeft, Building2, Save, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react"
import { useState } from "react"
import { createCompanyWithCustomers } from "@/app/actions/company-actions"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function NewCompanyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith(".csv")) {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie um arquivo CSV ou Excel",
        variant: "destructive",
      })
      return
    }

    setFile(selectedFile)

    // Read and preview CSV
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",").map((h) => h.trim())

      const preview = lines.slice(1, 6).map((line) => {
        const values = line.split(",").map((v) => v.trim())
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || ""
          return obj
        }, {} as any)
      })

      setPreviewData(preview)
    }
    reader.readAsText(selectedFile)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    // Add file to formData if exists
    if (file) {
      formData.append("customerFile", file)
    }

    try {
      const result = await createCompanyWithCustomers(formData)

      if (result.success) {
        toast({
          title: "Sucesso!",
          description: result.message,
        })
        router.push("/super-admin/companies")
      } else {
        toast({
          title: "Erro",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar empresa",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/super-admin/companies">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Nova Empresa</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Cadastre uma nova empresa cliente e importe sua base de clientes.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>Informações Básicas</span>
                </CardTitle>
                <CardDescription>Dados principais da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Empresa *</Label>
                    <Input name="name" id="name" placeholder="Ex: Enel Distribuição São Paulo" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input name="cnpj" id="cnpj" placeholder="00.000.000/0000-00" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Principal *</Label>
                    <Input name="email" id="email" type="email" placeholder="admin@empresa.com.br" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input name="phone" id="phone" placeholder="(11) 0000-0000" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    name="description"
                    id="description"
                    placeholder="Breve descrição da empresa e seus serviços..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>Endereço principal da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">CEP</Label>
                    <Input name="zip_code" id="zip_code" placeholder="00000-000" />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="address">Rua/Avenida</Label>
                    <Input name="address" id="address" placeholder="Nome da rua, número" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input name="city" id="city" placeholder="Nome da cidade" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input name="state" id="state" placeholder="SP" maxLength={2} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  <span>Base de Clientes (Opcional)</span>
                </CardTitle>
                <CardDescription>Importe a base de clientes da empresa em formato CSV ou Excel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerFile">Arquivo CSV/Excel</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="customerFile"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    {file && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  </div>
                  <p className="text-xs text-gray-500">
                    Formato esperado: nome, email, telefone, documento (CPF/CNPJ), endereço, cidade, estado, CEP
                  </p>
                </div>

                {previewData.length > 0 && (
                  <div className="space-y-2">
                    <Label>Preview (primeiras 5 linhas)</Label>
                    <div className="border rounded-lg overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            {Object.keys(previewData[0]).map((header) => (
                              <th key={header} className="px-4 py-2 text-left font-medium">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, idx) => (
                            <tr key={idx} className="border-t">
                              {Object.values(row).map((value: any, i) => (
                                <td key={i} className="px-4 py-2">
                                  {value}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {file && (
                  <div className="flex items-start space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">Arquivo selecionado: {file.name}</p>
                      <p className="text-xs mt-1">
                        Os clientes serão importados automaticamente após a criação da empresa.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>Criando...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Criar Empresa
                    </>
                  )}
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent" disabled={isSubmitting}>
                  <Link href="/super-admin/companies">Cancelar</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Próximos Passos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="bg-altea-gold text-altea-navy rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                    1
                  </div>
                  <p>Preencher dados da empresa</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="bg-altea-gold text-altea-navy rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                    2
                  </div>
                  <p>Fazer upload da base de clientes (opcional)</p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                    3
                  </div>
                  <p>Criar usuário administrador</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
