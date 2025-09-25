"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileText, FileSpreadsheet, Settings } from "lucide-react"
import { AdvancedExportDialog } from "./advanced-export-dialog"
import { toast } from "@/hooks/use-toast"

interface EnhancedExportButtonProps {
  data: any[]
  dataType: "debts" | "payments" | "negotiations" | "history" | "analytics"
  title: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
}

export function EnhancedExportButton({
  data,
  dataType,
  title,
  variant = "outline",
  size = "sm",
}: EnhancedExportButtonProps) {
  console.log("[v0] EnhancedExportButton - Component rendered with data:", data.length, "items, type:", dataType)

  const [isAdvancedDialogOpen, setIsAdvancedDialogOpen] = useState(false)

  const quickExport = (format: "csv" | "json") => {
    console.log("[v0] EnhancedExportButton - Quick export clicked, format:", format, "data count:", data.length)

    try {
      let content = ""
      let mimeType = ""
      let extension = ""

      if (format === "csv") {
        const headers = Object.keys(data[0] || {}).join(",")
        const rows = data.map((row) =>
          Object.values(row)
            .map((val) => `"${val}"`)
            .join(","),
        )
        content = [headers, ...rows].join("\n")
        mimeType = "text/csv"
        extension = "csv"
      } else {
        content = JSON.stringify(data, null, 2)
        mimeType = "application/json"
        extension = "json"
      }

      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log("[v0] EnhancedExportButton - Export successful, filename:", link.download)

      toast({
        title: "Exportação concluída",
        description: `${data.length} registros exportados em formato ${format.toUpperCase()}`,
      })
    } catch (error) {
      console.error("[v0] EnhancedExportButton - Export error:", error)
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro durante a exportação rápida",
        variant: "destructive",
      })
    }
  }

  const handleAdvancedClick = () => {
    console.log("[v0] EnhancedExportButton - Advanced options clicked")
    setIsAdvancedDialogOpen(true)
  }

  if (data.length === 0) {
    console.log("[v0] EnhancedExportButton - No data available, showing disabled button")
    return (
      <Button variant={variant} size={size} disabled>
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => quickExport("csv")}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => quickExport("json")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAdvancedClick}>
            <Settings className="h-4 w-4 mr-2" />
            Opções Avançadas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {console.log("[v0] EnhancedExportButton - Rendering AdvancedExportDialog, isOpen:", isAdvancedDialogOpen)}
      <AdvancedExportDialog
        isOpen={isAdvancedDialogOpen}
        onClose={() => {
          console.log("[v0] EnhancedExportButton - Closing advanced dialog")
          setIsAdvancedDialogOpen(false)
        }}
        data={data}
        dataType={dataType}
        title={title}
      />
    </>
  )
}
