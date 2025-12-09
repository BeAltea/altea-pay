"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  Search,
  RefreshCw,
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
  BarChart3,
  EyeOff,
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

export default function AnalysesPage() {
  const [analyses, setAnalyses] = useState<CreditAnalysis[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCompany, setFilterCompany] = useState<string>("all")
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<CreditAnalysis | null>(null)
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)
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

  const filteredAnalyses = analyses.filter((analysis) => {
    const matchesSearch =
      analysis.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.company_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCompany = filterCompany === "all" || analysis.company_id === filterCompany

    return matchesSearch && matchesCompany
  })

  const getSourceBadge = (source: string) => {
    return <Badge variant="default">Análise de Crédito</Badge>
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: "secondary", label: "Pendente" },
      completed: { variant: "default", label: "Concluída" },
      failed: { variant: "destructive", label: "Falhou" },
    }
    const config = variants[status] || variants.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
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

  const exportToPDF = async (analysis: CreditAnalysis) => {
    try {
      const response = await fetch("/api/export-analysis-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: analysis.id }),
      })

      if (!response.ok) {
        throw new Error("Falha ao gerar PDF")
      }

      const { html } = await response.json()

      // Criar uma nova janela com o HTML
      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        throw new Error("Popup bloqueado. Permita popups para exportar PDF.")
      }

      printWindow.document.write(html)
      printWindow.document.close()

      // Aguardar carregamento e imprimir
      printWindow.onload = () => {
        printWindow.print()
      }

      toast({
        title: "PDF gerado com sucesso!",
        description: "Use Ctrl+P ou Cmd+P para salvar como PDF",
      })
    } catch (error: any) {
      console.error("[v0] exportToPDF - Error:", error)
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
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto space-y-8 p-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Análises de Crédito
              </h1>
              <p className="text-muted-foreground text-lg">
                Visualize e gerencie todas as análises de crédito realizadas
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Total de Análises</CardDescription>
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">Total de registros</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 border-green-200 dark:border-green-900">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-2xl" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Concluídas</CardDescription>
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-4xl font-bold text-green-600 dark:text-green-400">{stats.completed}</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 hover:shadow-xl transition-all duration-300 border-yellow-200 dark:border-yellow-900">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-2xl" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="text-sm font-medium">Pendentes</CardDescription>
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">Aguardando análise</p>
            </CardContent>
          </Card>
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

        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                Análises de Crédito
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Visualize todas as análises realizadas no sistema
              </CardDescription>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, CPF ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 text-base"
                />
              </div>
              <div className="flex gap-3">
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger className="w-[220px] h-11">
                    <Building2 className="mr-2 h-5 w-5 text-muted-foreground" />
                    <SelectValue placeholder="Filtrar por empresa" />
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
                <Button variant="outline" size="lg" onClick={loadAnalyses} className="gap-2 bg-transparent">
                  <RefreshCw className="h-5 w-5" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
                <p className="text-muted-foreground">Carregando análises...</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedCustomers.size === filteredAnalyses.length && filteredAnalyses.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold min-w-[250px]">Cliente</TableHead>
                      <TableHead className="font-semibold text-center w-[120px]">Score</TableHead>
                      <TableHead className="font-semibold text-center w-[130px]">Status</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell text-center w-[150px]">Data</TableHead>
                      <TableHead className="text-center font-semibold w-[130px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnalyses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <div className="p-4 rounded-full bg-muted">
                              <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-lg font-medium text-muted-foreground">Nenhuma análise encontrada</p>
                            <p className="text-sm text-muted-foreground">Tente ajustar os filtros de busca</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAnalyses.map((analysis) => {
                        const rawScore = analysis.score
                        const displayScore = rawScore === 0 ? 5 : rawScore
                        const isPending = analysis.status === "pending"

                        return (
                          <TableRow key={analysis.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                              <Checkbox
                                checked={selectedCustomers.has(analysis.id)}
                                onCheckedChange={() => toggleSelection(analysis.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-base">{analysis.customer_name || "N/A"}</span>
                                <span className="text-sm text-muted-foreground font-mono">{analysis.cpf}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`font-bold text-xl ${getScoreColor(displayScore as number)}`}>
                                {displayScore !== null && displayScore !== undefined ? `${displayScore}` : "N/A"}
                              </span>
                              {displayScore !== null && displayScore !== undefined && (
                                <span className="text-xs text-muted-foreground ml-1">pts</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{getStatusBadge(analysis.status)}</TableCell>
                            <TableCell className="hidden md:table-cell text-center text-sm text-muted-foreground">
                              {analysis.status === "completed" ? formatDate(analysis.created_at) : "Não realizada"}
                            </TableCell>
                            <TableCell className="text-center">
                              {isPending ? (
                                <Button variant="ghost" size="sm" disabled className="gap-2">
                                  <EyeOff className="h-4 w-4" />
                                  <span className="hidden sm:inline">Pendente</span>
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => viewAnalysis(analysis.id)}
                                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="hidden sm:inline">Detalhes</span>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
          <SheetContent className="w-full sm:max-w-4xl overflow-y-auto bg-background">
            <SheetHeader>
              <SheetTitle className="text-2xl">Análise de Crédito Completa</SheetTitle>
              <SheetDescription>Dados completos da análise de crédito do cliente</SheetDescription>
            </SheetHeader>

            {selectedAnalysis && (
              <div className="mt-6 space-y-6">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent"
                  onClick={() => exportToPDF(selectedAnalysis)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Análise de Crédito Detalhada
                </Button>

                <Button variant="outline" className="ml-2 bg-transparent" onClick={() => exportToPDF(selectedAnalysis)}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>

                {/* Score Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <TrendingUp className="h-4 w-4" />
                        SCORE DE CRÉDITO
                      </CardTitle>
                      <CardDescription>Análise de Crédito</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
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
                              <div className="text-5xl font-bold text-purple-600 dark:text-purple-400">
                                {displayScore}
                              </div>
                              <p className="text-sm font-medium text-foreground">Classe {scoreClass}</p>
                              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">{scoreFaixa}</p>
                              {scoreFaixaDescricao && (
                                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                  {scoreFaixaDescricao}
                                </p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Sanções CEIS
                      </CardTitle>
                      <CardDescription>Empresas Inidôneas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-5xl font-bold text-red-600 dark:text-red-400">
                        {selectedAnalysis.assertiva_data?.credito?.resposta?.ceis?.qtdOcorrencias || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Punições CNEP
                      </CardTitle>
                      <CardDescription>Empresas Punidas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-5xl font-bold text-orange-600 dark:text-orange-400">
                        {selectedAnalysis.assertiva_data?.credito?.resposta?.cnep?.qtdOcorrencias || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Informações do Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">NOME COMPLETO</p>
                      <p className="font-medium text-foreground">{selectedAnalysis.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                      <p className="font-medium text-foreground">{selectedAnalysis.cpf}</p>
                    </div>
                  </CardContent>
                </Card>

                {selectedAnalysis.assertiva_data?.recupere?.resposta?.score && (
                  <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <TrendingUp className="h-5 w-5" />
                        Score Recupere
                      </CardTitle>
                      <CardDescription>Probabilidade de negociação e recuperação</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-5xl font-bold text-purple-600 dark:text-purple-400">
                            {selectedAnalysis.assertiva_data.recupere.resposta.score.pontos}
                          </div>
                          <p className="text-sm font-medium text-foreground mt-2">
                            Classe {selectedAnalysis.assertiva_data.recupere.resposta.score.classe}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-base px-4 py-2 bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700"
                        >
                          {selectedAnalysis.assertiva_data.recupere.resposta.score.faixa?.titulo || "Índice de acordo"}
                        </Badge>
                      </div>
                      {selectedAnalysis.assertiva_data.recupere.resposta.score.faixa?.descricao && (
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                          <p className="text-sm text-foreground leading-relaxed">
                            {selectedAnalysis.assertiva_data.recupere.resposta.score.faixa.descricao}
                          </p>
                        </div>
                      )}
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
                        typeof selectedAnalysis.assertiva_data.credito.resposta.faturamentoEstimado.valor ===
                          "number" &&
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
                    <CardDescription>Empresas que consultaram este documento</CardDescription>
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
                                <p className="font-medium text-sm">{consulta.consultante}</p>
                                <p className="text-xs text-muted-foreground">{consulta.dataOcorrencia}</p>
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
                              {selectedAnalysis.assertiva_data.credito.resposta.protestosPublicos.valorTotal || "N/A"}
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
                              Total:{" "}
                              {selectedAnalysis.assertiva_data.credito.resposta.chequesSemFundoCCF.qtdOcorrencias}{" "}
                              ocorrência(s)
                            </p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">
                              {selectedAnalysis.assertiva_data.credito.resposta.chequesSemFundoCCF.valorTotal || "N/A"}
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
    </div>
  )
}
