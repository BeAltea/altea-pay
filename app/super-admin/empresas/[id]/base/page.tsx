"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Download, FileSpreadsheet } from "lucide-react"
import { notFound } from "next/navigation"
import { useState } from "react"

export default async function EmpresaBasePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: company } = await supabase.from("companies").select("*").eq("id", params.id).single()

  if (!company) {
    notFound()
  }

  const [importStatus, setImportStatus] = useState("")

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const { data, error } = await supabase.storage.from("company-data").upload(`${params.id}/${file.name}`, file)
      if (error) {
        setImportStatus("Erro ao importar arquivo")
      } else {
        setImportStatus("Arquivo importado com sucesso")
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Base - {company.name}</h1>
        <p className="text-muted-foreground">Importe ou exporte a base de clientes e faturas</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Base
            </CardTitle>
            <CardDescription>Faça upload de um arquivo CSV ou Excel com clientes e faturas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">Arraste um arquivo ou clique para selecionar</p>
              <input type="file" onChange={handleFileUpload} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Button>Selecionar Arquivo</Button>
              </label>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Formatos aceitos: CSV, XLSX</p>
              <p>Tamanho máximo: 10MB</p>
              <p>Colunas obrigatórias: Nome, Documento</p>
            </div>
            {importStatus && <p className="text-sm">{importStatus}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Base
            </CardTitle>
            <CardDescription>Baixe a base atual de clientes em formato CSV</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button className="w-full bg-transparent" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar Clientes (CSV)
              </Button>
              <Button className="w-full bg-transparent" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar Faturas (CSV)
              </Button>
              <Button className="w-full bg-transparent" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar Tudo (ZIP)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
