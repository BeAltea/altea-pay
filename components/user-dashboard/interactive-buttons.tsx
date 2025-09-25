"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface PaymentButtonProps {
  debt: any
}

export function PaymentButton({ debt }: PaymentButtonProps) {
  const handlePayment = () => {
    // Simulate payment process
    console.log("[v0] Simulating payment for debt:", debt.id)
    toast({
      title: "Redirecionando para pagamento",
      description: "Você será redirecionado para o gateway de pagamento...",
    })
    // In real app, this would redirect to payment gateway
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-1 text-xs bg-transparent hover:bg-blue-50 transition-colors"
      onClick={handlePayment}
    >
      Pagar
    </Button>
  )
}

interface ExportButtonProps {
  data: any[]
  filename: string
}

export function ExportButton({ data, filename }: ExportButtonProps) {
  const handleExport = () => {
    // Simulate CSV export
    const csvContent = "data:text/csv;charset=utf-8," + data.map((row) => Object.values(row).join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${filename}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportação concluída",
      description: "Relatório exportado com sucesso!",
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="bg-transparent hover:bg-green-50 transition-colors"
    >
      <Download className="h-4 w-4 mr-2" />
      Exportar
    </Button>
  )
}

interface RefreshButtonProps {
  isRefreshing?: boolean
}

export function RefreshButton({ isRefreshing = false }: RefreshButtonProps) {
  const router = useRouter()

  const handleRefresh = () => {
    router.refresh()
    toast({
      title: "Página atualizada",
      description: "Os dados foram atualizados com sucesso!",
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-colors"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
      {isRefreshing ? "Atualizando..." : "Atualizar"}
    </Button>
  )
}
