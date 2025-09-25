"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { Download, FileText, FileSpreadsheet, FileJson, Filter, CheckCircle, Loader2, Mail, Cloud } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { DateRange } from "react-day-picker"

interface AdvancedExportDialogProps {
  isOpen: boolean
  onClose: () => void
  dataType: "debts" | "payments" | "negotiations" | "history" | "analytics"
  data: any[]
  title: string
}

export function AdvancedExportDialog({ isOpen, onClose, dataType, data, title }: AdvancedExportDialogProps) {
  const [exportFormat, setExportFormat] = useState<"csv" | "excel" | "pdf" | "json">("csv")
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [filters, setFilters] = useState({
    status: "all",
    minAmount: "",
    maxAmount: "",
  })
  const [deliveryMethod, setDeliveryMethod] = useState<"download" | "email" | "cloud">("download")
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportComplete, setExportComplete] = useState(false)

  const getAvailableFields = () => {
    const fieldMappings = {
      debts: [
        { key: "id", label: "ID da Dívida", default: true },
        { key: "description", label: "Descrição", default: true },
        { key: "amount", label: "Valor", default: true },
        { key: "due_date", label: "Data de Vencimento", default: true },
        { key: "status", label: "Status", default: true },
        { key: "days_overdue", label: "Dias em Atraso", default: false },
        { key: "classification", label: "Classificação", default: false },
        { key: "propensity_payment_score", label: "Score de Pagamento", default: false },
        { key: "propensity_loan_score", label: "Score de Empréstimo", default: false },
        { key: "created_at", label: "Data de Criação", default: false },
      ],
      payments: [
        { key: "id", label: "ID do Pagamento", default: true },
        { key: "amount", label: "Valor", default: true },
        { key: "payment_date", label: "Data do Pagamento", default: true },
        { key: "payment_method", label: "Método de Pagamento", default: true },
        { key: "status", label: "Status", default: true },
        { key: "transaction_id", label: "ID da Transação", default: false },
        { key: "debt_description", label: "Descrição da Dívida", default: true },
      ],
      negotiations: [
        { key: "id", label: "ID da Negociação", default: true },
        { key: "proposed_amount", label: "Valor Proposto", default: true },
        { key: "proposed_installments", label: "Parcelas Propostas", default: true },
        { key: "status", label: "Status", default: true },
        { key: "message", label: "Mensagem", default: false },
        { key: "response_message", label: "Resposta da Empresa", default: false },
        { key: "created_at", label: "Data de Criação", default: true },
        { key: "debt_description", label: "Descrição da Dívida", default: true },
      ],
      history: [
        { key: "date", label: "Data", default: true },
        { key: "action", label: "Ação", default: true },
        { key: "description", label: "Descrição", default: true },
        { key: "amount", label: "Valor", default: false },
        { key: "status", label: "Status", default: true },
      ],
      analytics: [
        { key: "metric", label: "Métrica", default: true },
        { key: "value", label: "Valor", default: true },
        { key: "period", label: "Período", default: true },
        { key: "trend", label: "Tendência", default: false },
      ],
    }

    return fieldMappings[dataType] || []
  }

  const availableFields = getAvailableFields()

  // Initialize selected fields with defaults
  useState(() => {
    const defaultFields = availableFields.filter((field) => field.default).map((field) => field.key)
    setSelectedFields(defaultFields)
  })

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldKey) ? prev.filter((key) => key !== fieldKey) : [...prev, fieldKey],
    )
  }

  const generateExportData = () => {
    let filteredData = [...data]

    // Apply date range filter
    if (dateRange?.from && dateRange?.to) {
      filteredData = filteredData.filter((item) => {
        const itemDate = new Date(item.created_at || item.payment_date || item.date)
        return itemDate >= dateRange.from! && itemDate <= dateRange.to!
      })
    }

    // Apply status filter
    if (filters.status !== "all") {
      filteredData = filteredData.filter((item) => item.status === filters.status)
    }

    // Apply amount filters
    if (filters.minAmount) {
      filteredData = filteredData.filter((item) => Number(item.amount || 0) >= Number(filters.minAmount))
    }
    if (filters.maxAmount) {
      filteredData = filteredData.filter((item) => Number(item.amount || 0) <= Number(filters.maxAmount))
    }

    // Select only chosen fields
    return filteredData.map((item) => {
      const exportItem: any = {}
      selectedFields.forEach((field) => {
        exportItem[field] = item[field] || "-"
      })
      return exportItem
    })
  }

  const formatDataForExport = (data: any[], format: string) => {
    const headers = selectedFields.map((field) => {
      const fieldInfo = availableFields.find((f) => f.key === field)
      return fieldInfo?.label || field
    })

    switch (format) {
      case "csv":
        const csvContent = [
          headers.join(","),
          ...data.map((row) => selectedFields.map((field) => `"${row[field] || ""}"`).join(",")),
        ].join("\n")
        return csvContent

      case "json":
        return JSON.stringify(data, null, 2)

      case "excel":
        // For demo purposes, we'll generate CSV format
        // In a real app, you'd use a library like xlsx
        return [
          headers.join("\t"),
          ...data.map((row) => selectedFields.map((field) => row[field] || "").join("\t")),
        ].join("\n")

      default:
        return JSON.stringify(data, null, 2)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Simulate export progress
      const progressInterval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const exportData = generateExportData()
      const formattedData = formatDataForExport(exportData, exportFormat)

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setExportProgress(100)

      if (deliveryMethod === "download") {
        // Create and download file
        const blob = new Blob([formattedData], {
          type: exportFormat === "json" ? "application/json" : "text/csv",
        })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.${exportFormat === "excel" ? "xlsx" : exportFormat}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      setExportComplete(true)

      toast({
        title: "Exportação concluída",
        description: `${exportData.length} registros exportados com sucesso!`,
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro durante a exportação. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleClose = () => {
    setExportProgress(0)
    setExportComplete(false)
    setIsExporting(false)
    onClose()
  }

  const getStatusOptions = () => {
    const statusMappings = {
      debts: [
        { value: "all", label: "Todos os Status" },
        { value: "open", label: "Em Aberto" },
        { value: "overdue", label: "Em Atraso" },
        { value: "paid", label: "Pago" },
        { value: "negotiated", label: "Negociado" },
      ],
      payments: [
        { value: "all", label: "Todos os Status" },
        { value: "completed", label: "Concluído" },
        { value: "pending", label: "Pendente" },
        { value: "failed", label: "Falhou" },
      ],
      negotiations: [
        { value: "all", label: "Todos os Status" },
        { value: "active", label: "Ativo" },
        { value: "accepted", label: "Aceito" },
        { value: "rejected", label: "Rejeitado" },
        { value: "completed", label: "Concluído" },
      ],
    }

    return statusMappings[dataType as keyof typeof statusMappings] || [{ value: "all", label: "Todos" }]
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar {title}
          </DialogTitle>
          <DialogDescription>Configure as opções de exportação para seus dados</DialogDescription>
        </DialogHeader>

        {!exportComplete ? (
          <Tabs defaultValue="format" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="format">Formato</TabsTrigger>
              <TabsTrigger value="fields">Campos</TabsTrigger>
              <TabsTrigger value="filters">Filtros</TabsTrigger>
              <TabsTrigger value="delivery">Entrega</TabsTrigger>
            </TabsList>

            <TabsContent value="format" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Escolha o Formato</CardTitle>
                  <CardDescription>Selecione como deseja exportar seus dados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        format: "csv" as const,
                        icon: FileText,
                        title: "CSV",
                        description: "Arquivo de texto separado por vírgulas",
                        recommended: true,
                      },
                      {
                        format: "excel" as const,
                        icon: FileSpreadsheet,
                        title: "Excel",
                        description: "Planilha do Microsoft Excel",
                        recommended: false,
                      },
                      {
                        format: "json" as const,
                        icon: FileJson,
                        title: "JSON",
                        description: "Formato de dados estruturados",
                        recommended: false,
                      },
                      {
                        format: "pdf" as const,
                        icon: FileText,
                        title: "PDF",
                        description: "Documento portátil (em breve)",
                        recommended: false,
                        disabled: true,
                      },
                    ].map((option) => (
                      <Card
                        key={option.format}
                        className={`cursor-pointer transition-all ${
                          exportFormat === option.format
                            ? "ring-2 ring-altea-navy bg-blue-50"
                            : option.disabled
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-gray-50"
                        }`}
                        onClick={() => !option.disabled && setExportFormat(option.format)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <option.icon className="h-8 w-8 text-altea-navy" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{option.title}</h4>
                                {option.recommended && <Badge variant="default">Recomendado</Badge>}
                                {option.disabled && <Badge variant="secondary">Em breve</Badge>}
                              </div>
                              <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fields" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Selecionar Campos</CardTitle>
                  <CardDescription>Escolha quais informações incluir na exportação</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFields(availableFields.map((f) => f.key))}
                      >
                        Selecionar Todos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFields(availableFields.filter((f) => f.default).map((f) => f.key))}
                      >
                        Apenas Essenciais
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedFields([])}>
                        Limpar Seleção
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableFields.map((field) => (
                        <div key={field.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={field.key}
                            checked={selectedFields.includes(field.key)}
                            onCheckedChange={() => handleFieldToggle(field.key)}
                          />
                          <Label htmlFor={field.key} className="text-sm cursor-pointer">
                            {field.label}
                            {field.default && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Padrão
                              </Badge>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg mt-4">
                      <p className="text-sm text-blue-800">
                        <strong>{selectedFields.length}</strong> campos selecionados de{" "}
                        <strong>{availableFields.length}</strong> disponíveis
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="filters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros de Dados
                  </CardTitle>
                  <CardDescription>Refine os dados que serão exportados</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Período</Label>
                      <DatePickerWithRange date={dateRange} setDate={setDateRange} />
                    </div>

                    <div>
                      <Label>Status</Label>
                      <Select
                        value={filters.status}
                        onValueChange={(value) => setFilters({ ...filters, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getStatusOptions().map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(dataType === "debts" || dataType === "payments") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Valor Mínimo (R$)</Label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={filters.minAmount}
                          onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="0,00"
                        />
                      </div>

                      <div>
                        <Label>Valor Máximo (R$)</Label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={filters.maxAmount}
                          onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Prévia:</strong> {generateExportData().length} registros serão exportados com os filtros
                      atuais
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="delivery" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Método de Entrega</CardTitle>
                  <CardDescription>Como você deseja receber o arquivo exportado</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        method: "download" as const,
                        icon: Download,
                        title: "Download Direto",
                        description: "Baixar arquivo imediatamente",
                        available: true,
                      },
                      {
                        method: "email" as const,
                        icon: Mail,
                        title: "Enviar por Email",
                        description: "Receber arquivo por email (em breve)",
                        available: false,
                      },
                      {
                        method: "cloud" as const,
                        icon: Cloud,
                        title: "Salvar na Nuvem",
                        description: "Salvar no Google Drive ou Dropbox (em breve)",
                        available: false,
                      },
                    ].map((option) => (
                      <Card
                        key={option.method}
                        className={`cursor-pointer transition-all ${
                          deliveryMethod === option.method
                            ? "ring-2 ring-altea-navy bg-blue-50"
                            : option.available
                              ? "hover:bg-gray-50"
                              : "opacity-50 cursor-not-allowed"
                        }`}
                        onClick={() => option.available && setDeliveryMethod(option.method)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <option.icon className="h-6 w-6 text-altea-navy" />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{option.title}</h4>
                                {!option.available && <Badge variant="secondary">Em breve</Badge>}
                              </div>
                              <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6 text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-xl font-bold text-green-700 mb-2">Exportação Concluída!</h3>
              <p className="text-gray-600">
                Seus dados foram exportados com sucesso. O arquivo foi baixado automaticamente.
              </p>
            </div>
          </div>
        )}

        {isExporting && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Exportando dados...</span>
            </div>
            <Progress value={exportProgress} className="w-full" />
            <p className="text-xs text-gray-500 text-center">{exportProgress}% concluído</p>
          </div>
        )}

        <div className="flex gap-2">
          {!exportComplete && !isExporting && (
            <Button onClick={handleExport} disabled={selectedFields.length === 0} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Exportar {generateExportData().length} Registros
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={isExporting}>
            {exportComplete ? "Fechar" : "Cancelar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
