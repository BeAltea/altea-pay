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
import { ArrowLeft, Building2, Upload, FileSpreadsheet } from "lucide-react"
import Link from "next/link"
import { createCompanyWithCustomers } from "@/app/actions/company-actions"
import { useToast } from "@/hooks/use-toast"

export default function NovaEmpresaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)

      // Preview do arquivo
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const lines = text.split("\n").filter((line) => line.trim())
        const preview = lines.slice(0, 6) // Header + 5 linhas
        setPreviewData(preview.map((line) => line.split(",")))
      }
      reader.readAsText(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      // Adiciona o arquivo se existir
      if (file) {
        formData.set("customersFile", file)
      }

      const result = await createCompanyWithCustomers(formData)

      if (result.success) {
        toast({
          title: "Empresa criada com sucesso!",
          description: result.message,
        })
        router.push("/super-admin/empresas")
      } else {
        toast({
          title: "Erro ao criar empresa",
          description: result.error,
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
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue="active">
                <SelectTrigger>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Base de Clientes
            </CardTitle>
            <CardDescription>
              Faça upload de um arquivo CSV ou Excel com os dados dos clientes (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customersFile">Arquivo CSV/Excel</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="customersFile"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {file && <FileSpreadsheet className="h-5 w-5 text-green-600" />}
              </div>
              <p className="text-xs text-muted-foreground">
                O arquivo deve conter as colunas: nome, email, telefone, documento (CPF/CNPJ)
              </p>
            </div>

            {previewData.length > 0 && (
              <div className="space-y-2">
                <Label>Preview dos Dados</Label>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i} className={i === 0 ? "bg-muted font-medium" : ""}>
                          {row.map((cell: string, j: number) => (
                            <td key={j} className="px-3 py-2 border-r last:border-r-0">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">Mostrando as primeiras 5 linhas do arquivo</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href="/super-admin/empresas">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar Empresa"}
          </Button>
        </div>
      </form>
    </div>
  )
}
