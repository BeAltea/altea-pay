"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { uploadBase } from "@/app/actions/credit-actions"

interface UploadBaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  onSuccess?: () => void
}

export function UploadBaseModal({ open, onOpenChange, companyId, onSuccess }: UploadBaseModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo CSV",
          variant: "destructive",
        })
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setUploading(true)

      const reader = new FileReader()
      reader.onload = async (e) => {
        const content = e.target?.result as string
        const base64 = btoa(content)

        const result = await uploadBase({
          company_id: companyId,
          file_data: base64,
          file_name: file.name,
        })

        if (result.success) {
          toast({
            title: "Upload concluído",
            description: result.message,
          })
          onOpenChange(false)
          onSuccess?.()
        } else {
          throw new Error(result.message)
        }
      }

      reader.readAsText(file)
    } catch (error: any) {
      console.error("[v0] Error uploading file:", error)
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Base de Clientes</DialogTitle>
          <DialogDescription>Faça upload de um arquivo CSV com os dados dos clientes</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="mt-4">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-sm font-medium text-primary hover:underline">Clique para selecionar</span>
                <span className="text-sm text-muted-foreground"> ou arraste o arquivo aqui</span>
              </Label>
              <Input id="file-upload" type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </div>
            {file && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-muted p-4">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1 text-sm">
                <p className="font-medium">Formato do arquivo CSV:</p>
                <p className="text-muted-foreground">nome,email,documento,telefone</p>
                <p className="text-muted-foreground">Exemplo: João Silva,joao@email.com,12345678900,11999999999</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Importando..." : "Importar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
