"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { exportBase } from "@/app/actions/credit-actions"

interface ExportBaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
}

export function ExportBaseModal({ open, onOpenChange, companyId }: ExportBaseModalProps) {
  const [includeAnalysis, setIncludeAnalysis] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    try {
      setExporting(true)

      const result = await exportBase({
        company_id: companyId,
        include_analysis: includeAnalysis,
      })

      if (result.success && result.file_data) {
        const blob = new Blob([Buffer.from(result.file_data, "base64").toString()], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = result.file_name || "clientes.csv"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        toast({
          title: "Export concluído",
          description: result.message,
        })
        onOpenChange(false)
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error("[v0] Error exporting:", error)
      toast({
        title: "Erro no export",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar Base de Clientes</DialogTitle>
          <DialogDescription>Baixe um arquivo CSV com os dados dos clientes</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-analysis"
              checked={includeAnalysis}
              onCheckedChange={(checked) => setIncludeAnalysis(checked === true)}
            />
            <Label
              htmlFor="include-analysis"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Incluir dados de análise restritiva
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exportando..." : "Exportar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
