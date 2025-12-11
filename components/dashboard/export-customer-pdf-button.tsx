"use client"

import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export function ExportCustomerPDFButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/export-customer-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Falha ao gerar PDF")
      }

      const { html } = await response.json()

      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        throw new Error("Popup bloqueado. Permita popups para exportar PDF.")
      }

      printWindow.document.write(html)
      printWindow.document.close()

      printWindow.onload = () => {
        printWindow.print()
      }

      toast({
        title: "PDF gerado com sucesso!",
        description: `Relatório de ${customerName} pronto para download`,
      })
    } catch (error: any) {
      toast({
        title: "Erro ao gerar PDF",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline" size="sm" className="gap-2 bg-transparent">
      <FileDown className="h-4 w-4" />
      {loading ? "Gerando..." : "Baixar PDF"}
    </Button>
  )
}
