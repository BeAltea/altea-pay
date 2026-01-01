"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  AlertCircle,
  Sparkles,
  Loader2,
  Eye,
  Building2,
  FileText,
  AlertTriangle,
  TrendingUp,
  Download,
  DollarSign,
  CreditCard,
  Shield,
  Check,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Square,
  CheckSquare,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { runAssertivaManualAnalysis, getAllCompanies } from "@/app/actions/credit-actions"
import { getAllCustomers } from "@/app/actions/analyses-actions"

interface CreditAnalysis {
  id: string
  customer_id: string
  company_id: string
  cpf: string
  score: number | null
  source: string
  analysis_type: string
  status: string
  created_at: string
  customer_name?: string
  company_name?: string
  data?: any
  assertiva_data?: any // Added assertiva_data to the interface
}

type SortField = "name" | "score" | "status" | "date"
type SortDirection = "asc" | "desc"

export default function AnalysesPage() {
  const [analyses, setAnalyses] = useState<CreditAnalysis[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCompany, setFilterCompany] = useState<string>("all") // Renamed from filterCompany to filterCompany
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<CreditAnalysis | null>(null)
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const { toast } = useToast()

  // Helper for currency formatting
  const newIntl = typeof window !== "undefined" ? window.Intl : null

  useEffect(() => {
    loadAnalyses()
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      const response = await getAllCompanies()
      if (response.success) {
        setCompanies(response.data)
      }
    } catch (error) {
      console.error("Error loading companies:", error)
    }
  }

  const loadAnalyses = async () => {
    try {
      setLoading(true)

      const response = await getAllCustomers()

      if (response.success) {
        const mappedData = response.data.map((customer: any) => {
          const assertiva_data = customer.analysis_metadata || null

          let displayScore = customer.credit_score

          if (displayScore === 0) {
            displayScore = 5
          }

          const hasAnalysis = customer.analysis_metadata && customer.last_analysis_date
          const status = hasAnalysis ? "completed" : "pending"

          return {
            id: customer.id,
            customer_id: customer.id,
            company_id: customer.company_id,
            cpf: customer.document,
            score: displayScore, // Main score only (converted 0 → 5)
            source: customer.source_table,
            analysis_type: hasAnalysis ? "detailed" : "pending",
            status, // Set status based on analysis completion
            created_at: customer.last_analysis_date || customer.created_at,
            customer_name: customer.name,
            company_name: customer.company_name,
            assertiva_data, // Pass assertiva_data directly (not nested)
          }
        })

        setAnalyses(mappedData)
      } else {
        toast({
          title: "Erro ao carregar clientes",
          description: response.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />
  }

  const filteredAnalyses = analyses
    .filter((analysis) => {
      const matchesSearch =
        analysis.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        analysis.cpf?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCompany = filterCompany === "all" || analysis.company_id === filterCompany
      return matchesSearch && matchesCompany
    })
    .sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1
      switch (sortField) {
        case "name":
          return direction * (a.customer_name || "").localeCompare(b.customer_name || "")
        case "score":
          return direction * ((a.score || 0) - (b.score || 0))
        case "status":
          return direction * (a.status || "").localeCompare(b.status || "")
        case "date":
          // Use created_at for sorting, which should be more reliable than last_analysis_date for order
          const dateA = new Date(a.created_at || "1970-01-01T00:00:00Z")
          const dateB = new Date(b.created_at || "1970-01-01T00:00:00Z")
          return direction * (dateA.getTime() - dateB.getTime())
        default:
          return 0
      }
    })

  const getSourceBadge = (source: string) => {
    return <Badge variant="default">Análise de Crédito</Badge>
  }

  const getScoreBadgeColor = (score: number | null) => {
    if (!score) return "bg-gray-500"
    // Adjusted score mapping for badges
    if (score >= 700) return "bg-green-500" // Good
    if (score >= 500) return "bg-blue-500" // Fair
    if (score >= 300) return "bg-yellow-500" // Caution
    if (score >= 100) return "bg-orange-500" // Risky
    return "bg-red-500" // Very Risky
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completo
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Falhou
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const stats = {
    total: analyses.length,
    completed: analyses.filter((a) => a.status === "completed").length,
    pending: analyses.filter((a) => a.status === "pending").length,
  }

  // Renamed from toggleCustomerSelection to toggleSelection
  const toggleSelection = (customerId: string) => {
    const newSet = new Set(selectedCustomers)
    if (newSet.has(customerId)) {
      newSet.delete(customerId)
    } else {
      newSet.add(customerId)
    }
    setSelectedCustomers(newSet)
  }

  // Renamed from toggleSelectAll to toggleSelectAll
  const toggleSelectAll = () => {
    if (selectedCustomers.size === filteredAnalyses.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(filteredAnalyses.map((a) => a.id)))
    }
  }

  // Renamed from handleRunAssertivaAnalysis to handleRunAnalysis
  const handleRunAnalysis = async () => {
    if (selectedCustomers.size === 0) {
      toast({
        title: "Nenhum cliente selecionado",
        description: "Selecione pelo menos um cliente para análise",
        variant: "destructive",
      })
      return
    }

    setShowConfirmModal(false)
    setIsRunningAnalysis(true)

    try {
      const customerIds = Array.from(selectedCustomers)
      const result = await runAssertivaManualAnalysis(customerIds)

      if (result.success) {
        toast({
          title: "Análise Concluída",
          description: `${result.analyzed} cliente(s) analisado(s) com sucesso`,
        })
        await loadAnalyses()
        setSelectedCustomers(new Set())
      } else {
        throw new Error(result.error || "Erro desconhecido")
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao executar análises",
        variant: "destructive",
      })
    } finally {
      setIsRunningAnalysis(false)
    }
  }

  // Renamed from handleRowClick to handleViewDetails
  const handleViewDetails = (analysis: CreditAnalysis) => {
    setSelectedAnalysis(analysis)
    setShowDetailsDrawer(true)
  }

  const exportToPDF = async (customer: any) => {
    if (!customer) return

    try {
      const response = await fetch("/api/export-customer-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id }),
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
        description: `Relatório de ${customer.name} pronto para download`,
      })
    } catch (error: any) {
      console.error("[v0] exportToPDF - Error:", error.message)
      toast({
        title: "Erro ao gerar PDF",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-gray-500"
    const adjustedScore = score === 0 ? 5 : score // Adjust score 0 to 5
    if (adjustedScore >= 700) return "text-green-600 dark:text-green-400"
    if (adjustedScore >= 500) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  const formatDate = (dateString: string) => {
    // Ensure dateString is valid before creating a Date object
    if (!dateString) return "Data Inválida"
    try {
      const date = new Date(dateString)
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Data Inválida"
      }
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      console.error("Error formatting date:", dateString, error)
      return "Erro ao formatar"
    }
  }

  // Helper to get the displayed score, converting 0 to 5
  const getDisplayedScore = (score: number | null | undefined): number | string => {
    if (score === null || score === undefined) return "N/A"
    return score === 0 ? 5 : score
  }

  // Placeholder for the missing viewAnalysis function
  const viewAnalysis = (analysisId: string) => {
    const analysis = analyses.find((a) => a.id === analysisId)
    if (analysis) {
      setSelectedAnalysis(analysis)
      setShowDetailsDrawer(true)
    } else {
      toast({
        title: "Erro ao visualizar análise",
        description: "Análise não encontrada.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-full overflow-x-hidden">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Análises de Crédito</h1>
            <p className="text-muted-foreground mt-1">
              Visualize e gerencie todas as análises realizadas pela API Assertiva
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="flex-1">
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="default"
              onClick={toggleSelectAll}
              className="gap-2 border-2 hover:border-primary bg-transparent"
            >
              {selectedCustomers.size === filteredAnalyses.length && filteredAnalyses.length > 0 ? (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Desmarcar Todos
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  Selecionar Todos ({filteredAnalyses.length})
                </>
              )}
            </Button>

            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={sortField === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("name")}
            className="text-xs"
          >
            Nome {getSortIcon("name")}
          </Button>
          <Button
            variant={sortField === "score" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("score")}
            className="text-xs"
          >
            Score {getSortIcon("score")}
          </Button>
          <Button
            variant={sortField === "status" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("status")}
            className="text-xs"
          >
            Status {getSortIcon("status")}
          </Button>
          <Button
            variant={sortField === "date" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSort("date")}
            className="text-xs"
          >
            Data {getSortIcon("date")}
          </Button>
        </div>
      </div>

      {selectedCustomers.size > 0 && (
        <Card className="border-2 border-yellow-300 dark:border-yellow-700 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-gray-900 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Análise de Crédito com Assertiva</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomers.size} cliente{selectedCustomers.size > 1 ? "s" : ""} selecionado
                    {selectedCustomers.size > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => setShowConfirmModal(true)}
                disabled={isRunningAnalysis}
                className="gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all"
              >
                {isRunningAnalysis ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Executar Análise ({selectedCustomers.size})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Carregando análises...</p>
            </CardContent>
          </Card>
        ) : filteredAnalyses.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Nenhuma análise encontrada</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou fazer uma nova busca</p>
            </CardContent>
          </Card>
        ) : (
          filteredAnalyses.map((analysis) => (
            <Card key={analysis.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedCustomers.has(analysis.customer_id)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedCustomers)
                          if (checked) {
                            newSet.add(analysis.customer_id)
                          } else {
                            newSet.delete(analysis.customer_id)
                          }
                          setSelectedCustomers(newSet)
                        }}
                        className="mt-1 border-2 border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{analysis.customer_name}</h3>
                        <p className="text-sm text-muted-foreground truncate">{analysis.cpf}</p>
                        {analysis.company_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Building2 className="h-3 w-3" />
                            {analysis.company_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {analysis.score !== null && (
                      <Badge className={`${getScoreBadgeColor(analysis.score)} text-white font-bold`}>
                        Score: {analysis.score}
                      </Badge>
                    )}
                    {getStatusBadge(analysis.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAnalysis(analysis)
                        setShowDetailsDrawer(true)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Confirmar Análise de Crédito
            </DialogTitle>
            <DialogDescription>
              Você está prestes a executar a análise de crédito para {selectedCustomers.size} cliente
              {selectedCustomers.size > 1 ? "s" : ""}. Esta ação irá consumir créditos da API Assertiva.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRunAnalysis} className="bg-yellow-600 hover:bg-yellow-700">
              Confirmar Análise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={showDetailsDrawer} onOpenChange={setShowDetailsDrawer}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto bg-background p-4 sm:p-6">
          <SheetHeader className="space-y-2">
            <SheetTitle className="text-xl sm:text-2xl">Análise de Crédito Completa</SheetTitle>
            <SheetDescription className="text-sm">Dados completos da análise de crédito do cliente</SheetDescription>
          </SheetHeader>

          {selectedAnalysis && (
            <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent"
                  onClick={() => exportToPDF(selectedAnalysis)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Análise Detalhada
                </Button>

                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent"
                  onClick={() => exportToPDF(selectedAnalysis)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>

              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <TrendingUp className="h-4 w-4" />
                      SCORE DE CRÉDITO
                    </CardTitle>
                    <CardDescription className="text-xs">Análise de Crédito</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="space-y-1">
                      {(() => {
                        const creditoScore = selectedAnalysis.assertiva_data?.credito?.resposta?.score?.pontos
                        const displayScore = creditoScore === 0 ? 5 : creditoScore || selectedAnalysis.score || 0
                        const scoreClass = selectedAnalysis.assertiva_data?.credito?.resposta?.score?.classe || "N/A"
                        const scoreFaixa =
                          selectedAnalysis.assertiva_data?.credito?.resposta?.score?.faixa?.titulo || "N/A"
                        const scoreFaixaDescricao =
                          selectedAnalysis.assertiva_data?.credito?.resposta?.score?.faixa?.descricao || ""

                        return (
                          <>
                            <div className="text-4xl sm:text-5xl font-bold text-purple-600 dark:text-purple-400">
                              {displayScore}
                            </div>
                            <p className="text-sm font-medium text-foreground">Classe {scoreClass}</p>
                            <p className="text-sm font-medium text-purple-600 dark:text-purple-400">{scoreFaixa}</p>
                            {scoreFaixaDescricao && (
                              <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">
                                {scoreFaixaDescricao}
                              </p>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Sanções CEIS
                    </CardTitle>
                    <CardDescription className="text-xs">Empresas Inidôneas</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-4xl sm:text-5xl font-bold text-red-600 dark:text-red-400">
                      {selectedAnalysis.assertiva_data?.credito?.resposta?.ceis?.qtdOcorrencias || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Punições CNEP
                    </CardTitle>
                    <CardDescription className="text-xs">Empresas Punidas</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-4xl sm:text-5xl font-bold text-orange-600 dark:text-orange-400">
                      {selectedAnalysis.assertiva_data?.credito?.resposta?.cnep?.qtdOcorrencias || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    Informações do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pb-3">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">NOME COMPLETO</p>
                    <p className="font-medium text-sm sm:text-base text-foreground break-words">
                      {selectedAnalysis.customer_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">CPF/CNPJ</p>
                    <p className="font-medium text-sm sm:text-base text-foreground">{selectedAnalysis.cpf}</p>
                  </div>
                </CardContent>
              </Card>

              {selectedAnalysis.assertiva_data?.recupere?.resposta?.score && (
                <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                      Score Recupere
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Probabilidade de negociação e recuperação
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="text-4xl sm:text-5xl font-bold text-purple-600 dark:text-purple-400">
                          {selectedAnalysis.assertiva_data.recupere.resposta.score.pontos}
                        </div>
                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mt-1">
                          Classe {selectedAnalysis.assertiva_data.recupere.resposta.score.classe}
                        </p>
                      </div>
                      {selectedAnalysis.assertiva_data.recupere.resposta.score.faixa && (
                        <div className="flex-1 sm:max-w-md">
                          <Badge className="bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100 mb-2 whitespace-normal h-auto py-1">
                            {selectedAnalysis.assertiva_data.recupere.resposta.score.faixa.titulo}
                          </Badge>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            {selectedAnalysis.assertiva_data.recupere.resposta.score.faixa.descricao}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedAnalysis.assertiva_data?.credito?.resposta?.faturamentoEstimado !== undefined && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Faturamento Estimado
                    </CardTitle>
                    <CardDescription>Estimativa de faturamento anual</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {newIntl &&
                      typeof selectedAnalysis.assertiva_data.credito.resposta.faturamentoEstimado.valor === "number" &&
                      selectedAnalysis.assertiva_data.credito.resposta.faturamentoEstimado.valor > 0
                        ? new newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            selectedAnalysis.assertiva_data.credito.resposta.faturamentoEstimado.valor,
                          )
                        : "Não informado"}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedAnalysis.assertiva_data?.credito?.resposta?.rendaPresumida?.valor && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Renda Presumida
                    </CardTitle>
                    <CardDescription>Estimativa de renda mensal</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {newIntl
                        ? new newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            selectedAnalysis.assertiva_data.credito.resposta.rendaPresumida.valor,
                          )
                        : "N/A"}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Faixa: {selectedAnalysis.assertiva_data.credito.resposta.rendaPresumida.faixa || "N/A"}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Protestos Públicos
                  </CardTitle>
                  <CardDescription>Protestos registrados em cartório</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedAnalysis.assertiva_data?.acoes?.resposta?.protestos?.list &&
                  selectedAnalysis.assertiva_data.acoes.resposta.protestos.list.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total de Protestos:</span>
                        <Badge variant="destructive" className="text-base">
                          {selectedAnalysis.assertiva_data.acoes.resposta.protestos.qtdProtestos}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Valor Total:</span>
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">
                          {newIntl
                            ? new newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                selectedAnalysis.assertiva_data.acoes.resposta.protestos.valorTotal,
                              )
                            : `R$ ${selectedAnalysis.assertiva_data.acoes.resposta.protestos.valorTotal}`}
                        </span>
                      </div>
                      <Separator />
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {selectedAnalysis.assertiva_data.acoes.resposta.protestos.list.map(
                          (protesto: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-medium text-sm">{protesto.cartorio}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {protesto.cidade} - {protesto.uf}
                                  </p>
                                </div>
                                <Badge variant="destructive" className="ml-2">
                                  {newIntl
                                    ? new newIntl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      }).format(protesto.valor)
                                    : `R$ ${protesto.valor}`}
                                </Badge>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Informação não disponível</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Últimas Consultas
                  </CardTitle>
                  <CardDescription>Histórico de consultas realizadas</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedAnalysis.assertiva_data?.credito?.resposta?.ultimasConsultas?.list &&
                  selectedAnalysis.assertiva_data.credito.resposta.ultimasConsultas.list.length > 0 ? (
                    <div className="space-y-3">
                      {selectedAnalysis.assertiva_data.credito.resposta.ultimasConsultas.list
                        .slice(0, 10)
                        .map((consulta: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center border-b pb-2 last:border-0">
                            <div>
                              <p className="font-medium text-sm">{consulta.dataOcorrencia}</p>
                              <p className="text-xs text-muted-foreground">Consulta realizada</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4" />
                      <p className="text-sm font-medium">Nenhuma consulta recente registrada</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Débitos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedAnalysis.assertiva_data?.credito?.resposta?.registrosDebitos?.list &&
                  selectedAnalysis.assertiva_data.credito.resposta.registrosDebitos.list.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm font-medium">
                          Total: {selectedAnalysis.assertiva_data.credito.resposta.registrosDebitos.qtdDebitos}{" "}
                          débito(s)
                        </p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                          {newIntl &&
                          typeof selectedAnalysis.assertiva_data.credito.resposta.registrosDebitos.valorTotal ===
                            "number"
                            ? new newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                selectedAnalysis.assertiva_data.credito.resposta.registrosDebitos.valorTotal,
                              )
                            : "N/A"}
                        </p>
                      </div>
                      {selectedAnalysis.assertiva_data.credito.resposta.registrosDebitos.list.map(
                        (debito: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-foreground">{debito.credor || "N/A"}</p>
                                <p className="text-sm text-muted-foreground">{debito.tipoDevedor?.titulo || ""}</p>
                              </div>
                              <Badge variant="destructive">
                                {newIntl && typeof debito.valor === "number"
                                  ? new newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                      debito.valor,
                                    )
                                  : "N/A"}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Vencimento</p>
                                <p className="text-foreground">{debito.dataVencimento || "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Cidade/UF</p>
                                <p className="text-foreground">
                                  {debito.cidade || "N/A"}/{debito.uf || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhum débito encontrado</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Protestos Públicos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedAnalysis.assertiva_data?.credito?.resposta?.protestosPublicos ? (
                    selectedAnalysis.assertiva_data.credito.resposta.protestosPublicos.qtdProtestos > 0 ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-sm font-medium">
                            Total: {selectedAnalysis.assertiva_data.credito.resposta.protestosPublicos.qtdProtestos}{" "}
                            protesto(s)
                          </p>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">
                            {newIntl &&
                            typeof selectedAnalysis.assertiva_data.credito.resposta.protestosPublicos.valorTotal ===
                              "number"
                              ? new newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                  selectedAnalysis.assertiva_data.credito.resposta.protestosPublicos.valorTotal,
                                )
                              : "N/A"}
                          </p>
                        </div>
                        {selectedAnalysis.assertiva_data.credito.resposta.protestosPublicos.list?.map(
                          (protesto: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-4 space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-foreground">{protesto.cartorio || "N/A"}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {protesto.cidade || ""}/{protesto.uf || ""}
                                  </p>
                                </div>
                                <Badge variant="destructive">{protesto.valor || "N/A"}</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Data</p>
                                  <p className="text-foreground">{protesto.data || "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-green-600 dark:text-green-400">✓ Nenhum protesto encontrado</p>
                    )
                  ) : (
                    <p className="text-muted-foreground">Informação não disponível</p>
                  )}
                </CardContent>
              </Card>

              {selectedAnalysis.assertiva_data?.credito?.resposta?.chequesSemFundoCCF && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Cheques sem Fundo (CCF)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedAnalysis.assertiva_data.credito.resposta.chequesSemFundoCCF.qtdOcorrencias > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            Total: {selectedAnalysis.assertiva_data.credito.resposta.chequesSemFundoCCF.qtdOcorrencias}{" "}
                            ocorrência(s)
                          </p>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">
                            {newIntl &&
                            typeof selectedAnalysis.assertiva_data.credito.resposta.chequesSemFundoCCF.valorTotal ===
                              "number"
                              ? new newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                  selectedAnalysis.assertiva_data.credito.resposta.chequesSemFundoCCF.valorTotal,
                                )
                              : "N/A"}
                          </p>
                        </div>
                        {selectedAnalysis.assertiva_data.credito.resposta.chequesSemFundoCCF.list?.map(
                          (cheque: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-4 space-y-2">
                              <p className="font-medium text-foreground">Banco: {cheque.banco || "N/A"}</p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Agência</p>
                                  <p className="text-foreground">{cheque.agencia || "N/A"}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Data</p>
                                  <p className="text-foreground">{cheque.data || "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-green-600 dark:text-green-400">✓ Nenhum cheque sem fundo encontrado</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
