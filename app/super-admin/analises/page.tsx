"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
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
  Target,
  DollarSign,
  CreditCard,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { runAssertivaManualAnalysis, getAllCompanies } from "@/app/actions/credit-actions"
import { analyzeCustomerCredit } from "@/app/actions/analyze-customer-credit"
import { getAllCustomers } from "@/app/actions/analyses-actions"
import Link from "next/link"

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
  const [filterSource, setFilterSource] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
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
      console.error("[CLIENT][v0] Error loading companies:", error)
    }
  }

  const loadAnalyses = async () => {
    try {
      console.log("[CLIENT][v0] AnalysesPage - Loading analyses...")
      setLoading(true)

      const response = await getAllCustomers()

      if (response.success) {
        const mappedData = response.data.map((customer: any) => ({
          id: customer.id,
          customer_id: customer.id,
          company_id: customer.company_id,
          cpf: customer.document || "N/A",
          score: customer.credit_score || null,
          source: customer.analysis_metadata ? "assertiva" : "pending",
          analysis_type: customer.analysis_metadata ? "detailed" : "pending",
          status: customer.analysis_metadata ? "completed" : "pending",
          created_at: customer.last_analysis_date || new Date().toISOString(),
          customer_name: customer.name,
          company_name: customer.company_name,
          data: customer.analysis_metadata,
          assertiva_data: customer.analysis_metadata?.assertiva_data || customer.analysis_metadata,
        }))

        setAnalyses(mappedData)
        console.log("[CLIENT][v0] AnalysesPage - Loaded all customers:", mappedData.length)
      } else {
        console.error("[CLIENT][v0] AnalysesPage - Error:", response.error)
        toast({
          title: "Erro ao carregar clientes",
          description: response.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[CLIENT][v0] AnalysesPage - Error loading customers:", error)
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
      analysis.cpf.includes(searchTerm) ||
      analysis.company_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesSource = filterSource === "all" || analysis.source === filterSource
    const matchesType = filterType === "all" || analysis.analysis_type === filterType
    const matchesCompany = filterCompany === "all" || analysis.company_id === filterCompany

    return matchesSearch && matchesSource && matchesType && matchesCompany
  })

  const getSourceBadge = (source: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      credit_analysis: { variant: "default", label: "Análise de Crédito" },
      assertiva: { variant: "default", label: "Análise de Crédito" },
      unknown: { variant: "outline", label: "Desconhecido" },
    }
    const config = variants[source] || variants.unknown
    return <Badge variant={config.variant}>{config.label}</Badge>
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
    credit_analysis: analyses.filter((a) => a.source === "assertiva" || a.source === "credit_analysis").length,
  }

  const toggleCustomerSelection = (customerId: string) => {
    const newSelection = new Set(selectedCustomers)
    if (newSelection.has(customerId)) {
      newSelection.delete(customerId)
    } else {
      newSelection.add(customerId)
    }
    setSelectedCustomers(newSelection)
    console.log("[v0] AnalysesPage - Selected customers:", newSelection.size)
  }

  const toggleSelectAll = () => {
    if (selectedCustomers.size === filteredAnalyses.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(filteredAnalyses.map((a) => a.customer_id)))
    }
  }

  const handleRunAssertivaAnalysis = async () => {
    if (selectedCustomers.size === 0) {
      toast({
        title: "Nenhum cliente selecionado",
        description: "Selecione pelo menos um cliente para executar a análise.",
        variant: "destructive",
      })
      return
    }

    console.log("[v0] AnalysesPage - Opening confirmation modal for", selectedCustomers.size, "customers")
    setShowConfirmModal(true)
  }

  const confirmAndRunAnalysis = async () => {
    setShowConfirmModal(false)
    setIsRunningAnalysis(true)

    try {
      console.log("[v0] AnalysesPage - Starting Assertiva analysis for", selectedCustomers.size, "customers")

      const firstCustomer = analyses.find((a) => selectedCustomers.has(a.customer_id))
      if (!firstCustomer) {
        throw new Error("Cliente não encontrado")
      }

      console.log("[v0] AnalysesPage - Company ID:", firstCustomer.company_id)

      const customerIdsToAnalyze = analyses
        .filter((a) => selectedCustomers.has(a.customer_id))
        .map((a) => a.customer_id)

      console.log("[v0] AnalysesPage - Customer IDs to analyze:", customerIdsToAnalyze)
      console.log("[v0] AnalysesPage - IDs type check:", {
        is_array: Array.isArray(customerIdsToAnalyze),
        length: customerIdsToAnalyze.length,
        first_id: customerIdsToAnalyze[0],
        first_id_type: typeof customerIdsToAnalyze[0],
      })

      const result = await runAssertivaManualAnalysis(customerIdsToAnalyze, firstCustomer.company_id)

      console.log("[v0] AnalysesPage - Analysis result:", result)

      if (result.success) {
        console.log("[v0] Running credit analysis to determine approval status for each customer...")
        let approvedCount = 0
        let rejectedCount = 0

        for (const customerId of customerIdsToAnalyze) {
          const customer = analyses.find((a) => a.customer_id === customerId)
          if (customer?.cpf) {
            const creditResult = await analyzeCustomerCredit(customerId, customer.cpf, 0)
            if (creditResult.success) {
              if (
                creditResult.resultado?.decisao === "ACEITA" ||
                creditResult.resultado?.decisao === "ACEITA_ESPECIAL"
              ) {
                approvedCount++
              } else {
                rejectedCount++
              }
            }
          }
        }

        const durationInSeconds =
          result.duration && typeof result.duration === "number" ? (result.duration / 1000).toFixed(2) : "0.00"

        toast({
          title: "Análise concluída!",
          description: `Análise Assertiva concluída com sucesso!

📊 Resumo:
- Total de clientes selecionados: ${result.total}
- Análises realizadas: ${result.analyzed}
- Já tinham análise (cache): ${result.cached}
- Falhas: ${result.failed}
- ✅ Aprovados: ${approvedCount}
- ❌ Rejeitados: ${rejectedCount}
- Tempo total: ${durationInSeconds}s`,
        })

        await loadAnalyses()
        setSelectedCustomers(new Set())
      } else {
        toast({
          title: "Erro na análise",
          description: result.error || "Erro desconhecido",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[v0] AnalysesPage - Error running Assertiva analysis:", error)
      toast({
        title: "Erro ao executar análise",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsRunningAnalysis(false)
    }
  }

  const viewAnalysis = async (analysis: any) => {
    console.log("[v0] AnalysesPage - Viewing analysis details:", analysis.id)
    console.log("[v0] AnalysesPage - Analysis data:", {
      id: analysis.id,
      customer_name: analysis.customer_name,
      cpf: analysis.cpf,
      score: analysis.score,
      source: analysis.source,
      analysis_type: analysis.analysis_type,
      has_data: !!analysis.data,
      data_keys: analysis.data ? Object.keys(analysis.data) : [],
    })

    if (analysis.assertiva_data) {
      console.log("[v0] AnalysesPage - Full assertiva data:", analysis.assertiva_data)
      const extractedScore = analysis.assertiva_data?.credito?.resposta?.score?.pontos
      console.log("[v0] AnalysesPage - Extracted score from assertiva_data:", extractedScore)
    }

    setSelectedAnalysis(analysis)
    setShowDetailsDrawer(true)
  }

  const exportToPDF = async (analysis: CreditAnalysis) => {
    try {
      console.log("[v0] exportToPDF - Starting export for analysis:", analysis.id)

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
    if (score >= 700) return "text-green-600 dark:text-green-400"
    if (score >= 500) return "text-yellow-600 dark:text-yellow-400"
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

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Análises de Crédito</h1>
        <p className="text-muted-foreground">Visualize e gerencie todas as análises de crédito realizadas</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Total de Análises</CardDescription>
            <CardTitle className="text-3xl text-foreground">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Concluídas</CardDescription>
            <CardTitle className="text-3xl text-green-600 dark:text-green-400">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Pendentes</CardDescription>
            <CardTitle className="text-3xl text-yellow-600 dark:text-yellow-400">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Análise de Crédito</CardDescription>
            <CardTitle className="text-3xl text-blue-600 dark:text-blue-400">{stats.credit_analysis}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Fixed button for Assertiva analysis */}
      {selectedCustomers.size > 0 && (
        <Card className="border-2 border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Sparkles className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Análise de Crédito (Paga)</h3>
                  <p className="text-sm text-muted-foreground">{selectedCustomers.size} cliente(s) selecionado(s)</p>
                </div>
              </div>
              <Button size="lg" onClick={handleRunAssertivaAnalysis} disabled={isRunningAnalysis} className="gap-2">
                {isRunningAnalysis ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Rodar Análise Paga ({selectedCustomers.size})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Análises de Crédito</CardTitle>
          <CardDescription>Visualize todas as análises realizadas no sistema</CardDescription>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, CPF ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fontes</SelectItem>
                  <SelectItem value="credit_analysis">Análise de Crédito</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="free">Gratuita</SelectItem>
                  <SelectItem value="detailed">Detalhada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="w-[200px]">
                  <Building2 className="mr-2 h-4 w-4" />
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
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadAnalyses}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCustomers.size === filteredAnalyses.length && filteredAnalyses.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Status da Análise</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnalyses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      {loading ? "Carregando..." : "Nenhuma análise encontrada"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAnalyses.map((analysis) => (
                    <TableRow key={analysis.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCustomers.has(analysis.customer_id)}
                          onCheckedChange={() => toggleCustomerSelection(analysis.customer_id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/super-admin/customers/${analysis.customer_id}`}
                          className="hover:underline text-primary hover:text-primary/80 transition-colors"
                        >
                          {analysis.customer_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-foreground">{analysis.cpf}</TableCell>
                      <TableCell className="text-foreground">{analysis.company_name}</TableCell>
                      <TableCell className={analysis.score ? getScoreColor(analysis.score) : "text-muted-foreground"}>
                        {analysis.score ? `${analysis.score} pts` : "N/A"}
                      </TableCell>
                      <TableCell>{getSourceBadge(analysis.source)}</TableCell>
                      <TableCell>
                        {analysis.status === "completed" ? (
                          <Badge variant="default">Analisado</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {analysis.analysis_type === "detailed" ? "Detalhada" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(analysis.status)}</TableCell>
                      <TableCell>
                        {analysis.status === "completed" ? formatDate(analysis.created_at) : "Não realizada"}
                      </TableCell>
                      <TableCell className="text-right">
                        {analysis.status === "completed" && (
                          <Button variant="ghost" size="sm" onClick={() => viewAnalysis(analysis)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Confirmar Análise de Crédito
            </DialogTitle>
            <div className="space-y-4 pt-4 text-sm text-muted-foreground">
              <p>Você está prestes a executar uma análise detalhada de crédito.</p>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:bg-yellow-950/20">
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">⚠️ Atenção:</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                  <li>Esta ação consome créditos de análise</li>
                  <li>Não pode ser desfeita</li>
                  <li>{selectedCustomers.size} cliente(s) será(ão) analisado(s)</li>
                  <li>O processo pode levar alguns minutos</li>
                </ul>
              </div>

              <p className="text-sm">Deseja continuar?</p>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAndRunAnalysis} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Confirmar e Executar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Drawer - ONLY THIS ONE */}
      <Sheet open={showDetailsDrawer} onOpenChange={setShowDetailsDrawer}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto bg-background">
          <SheetHeader>
            <SheetTitle className="text-2xl">Análise de Crédito Completa</SheetTitle>
            <SheetDescription>Dados completos da análise de crédito do cliente</SheetDescription>
          </SheetHeader>

          {selectedAnalysis && (
            <div className="space-y-6 mt-6 px-6">
              {console.log("[v0] Sheet - Rendering with selectedAnalysis:", {
                score: selectedAnalysis.score,
                assertiva_score: selectedAnalysis.assertiva_data?.credito?.resposta?.score?.pontos,
                has_assertiva_data: !!selectedAnalysis.assertiva_data,
              })}

              {/* Source Badge */}
              <div className="flex items-center justify-between">
                <Badge variant="default" className="text-base px-6 py-2">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Análise de Crédito Detalhada
                  </span>
                </Badge>
                <Button onClick={() => exportToPDF(selectedAnalysis)} className="gap-2" variant="outline">
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>

              {/* Summary Cards Grid */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* Score Card */}
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs uppercase tracking-wide">Score de Crédito</CardDescription>
                    <CardTitle
                      className={`text-5xl font-bold ${getScoreColor(
                        selectedAnalysis.assertiva_data?.credito?.resposta?.score?.pontos ||
                          selectedAnalysis.score ||
                          null,
                      )}`}
                    >
                      {(() => {
                        const score =
                          selectedAnalysis.assertiva_data?.credito?.resposta?.score?.pontos ||
                          selectedAnalysis.score ||
                          "N/A"
                        console.log("[v0] Sheet - Rendering score:", score)
                        return score
                      })()}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const actualScore =
                          selectedAnalysis.assertiva_data?.credito?.resposta?.score?.pontos ||
                          selectedAnalysis.score ||
                          0
                        if (actualScore >= 700) return "Risco Baixo"
                        if (actualScore >= 500) return "Risco Moderado"
                        if (actualScore >= 300) return "Risco Alto"
                        return "Risco Muito Alto"
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedAnalysis.assertiva_data?.credito?.resposta?.score?.faixa?.titulo || "Análise de Crédito"}
                    </p>
                  </CardHeader>
                </Card>

                {/* Sanctions Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs uppercase tracking-wide">Sanções CEIS</CardDescription>
                    <CardTitle className="text-5xl font-bold text-red-600 dark:text-red-400">
                      {selectedAnalysis.assertiva_data?.acoes?.resposta?.sancoesCEIS?.list?.length || 0}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Empresas Inidôneas</p>
                  </CardHeader>
                </Card>

                {/* Punishments Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs uppercase tracking-wide">Punições CNEP</CardDescription>
                    <CardTitle className="text-5xl font-bold text-orange-600 dark:text-orange-400">
                      {selectedAnalysis.assertiva_data?.acoes?.resposta?.punicoesCNEP?.list?.length || 0}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Empresas Punidas</p>
                  </CardHeader>
                </Card>
              </div>

              {/* Customer Information Card */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Informações do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">NOME COMPLETO</p>
                      <p className="text-lg font-semibold">{selectedAnalysis.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">CPF/CNPJ</p>
                      <p className="text-lg font-semibold">{selectedAnalysis.cpf || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedAnalysis.assertiva_data && (
                <>
                  {/* Score de Crédito Detalhado */}
                  {selectedAnalysis.assertiva_data.credito?.resposta?.score && (
                    <Card className="border-l-4 border-cyan-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                          <Target className="h-5 w-5" />
                          Score de Crédito Detalhado
                        </CardTitle>
                        <CardDescription>
                          {selectedAnalysis.assertiva_data.credito.resposta.score.faixa?.descricao ||
                            "Classificação de risco"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <p className="text-6xl font-bold text-cyan-600 dark:text-cyan-400">
                                {selectedAnalysis.assertiva_data.credito.resposta.score.pontos}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Classe {selectedAnalysis.assertiva_data.credito.resposta.score.classe}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant="outline"
                                className={`text-lg px-4 py-2 ${
                                  selectedAnalysis.assertiva_data.credito.resposta.score.pontos >= 700
                                    ? "border-green-500 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/20"
                                    : selectedAnalysis.assertiva_data.credito.resposta.score.pontos >= 500
                                      ? "border-yellow-500 text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"
                                      : selectedAnalysis.assertiva_data.credito.resposta.score.pontos >= 300
                                        ? "border-orange-500 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/20"
                                        : "border-red-500 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/20"
                                }`}
                              >
                                {selectedAnalysis.assertiva_data.credito.resposta.score.faixa?.titulo}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Renda Presumida */}
                  {selectedAnalysis.assertiva_data.credito?.resposta?.rendaPresumida?.valor && (
                    <Card className="border-l-4 border-emerald-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                          <DollarSign className="h-5 w-5" />
                          Renda Presumida
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(selectedAnalysis.assertiva_data.credito.resposta.rendaPresumida.valor || 0)}
                        </p>
                        {selectedAnalysis.assertiva_data.credito.resposta.rendaPresumida.faixa && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Faixa: {selectedAnalysis.assertiva_data.credito.resposta.rendaPresumida.faixa}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Últimas Consultas */}
                  {selectedAnalysis.assertiva_data.credito?.resposta?.ultimasConsultas?.list &&
                    selectedAnalysis.assertiva_data.credito.resposta.ultimasConsultas.list.length > 0 && (
                      <Card className="border-l-4 border-blue-500">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <Search className="h-5 w-5" />
                            Últimas Consultas (
                            {selectedAnalysis.assertiva_data.credito.resposta.ultimasConsultas.qtdUltConsultas || 0})
                          </CardTitle>
                          <CardDescription>
                            Consultas realizadas entre{" "}
                            {selectedAnalysis.assertiva_data.credito.resposta.ultimasConsultas.primeiraOcorrencia} e{" "}
                            {selectedAnalysis.assertiva_data.credito.resposta.ultimasConsultas.ultimaOcorrencia}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {selectedAnalysis.assertiva_data.credito.resposta.ultimasConsultas.list.map(
                              (consulta: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center border-b pb-2">
                                  <span className="font-medium">{consulta.consultante}</span>
                                  <span className="text-sm text-muted-foreground">{consulta.dataOcorrencia}</span>
                                </div>
                              ),
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Débitos */}
                  {selectedAnalysis.assertiva_data.credito?.resposta?.registrosDebitos?.list &&
                    selectedAnalysis.assertiva_data.credito.resposta.registrosDebitos.list.length > 0 && (
                      <Card className="border-l-4 border-red-500">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-5 w-5" />
                            Débitos ({selectedAnalysis.assertiva_data.credito.resposta.registrosDebitos.qtdDebitos || 0}
                            )
                          </CardTitle>
                          <CardDescription>
                            Total:{" "}
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(
                              selectedAnalysis.assertiva_data.credito.resposta.registrosDebitos.valorTotal || 0,
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {selectedAnalysis.assertiva_data.credito.resposta.registrosDebitos.list.map(
                              (debito: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="border rounded-lg p-4 space-y-2 bg-red-50/50 dark:bg-red-950/20"
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-semibold text-red-900 dark:text-red-100">{debito.credor}</p>
                                      <p className="text-sm text-muted-foreground">Contrato: {debito.contrato}</p>
                                      {debito.tipoDebito && (
                                        <Badge variant="outline" className="mt-1">
                                          {debito.tipoDebito}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                                      {new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      }).format(debito.valor || 0)}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Vencimento:</span>
                                      <span className="ml-2 font-medium">{debito.dataVencimento}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Inclusão:</span>
                                      <span className="ml-2 font-medium">{debito.dataInclusao}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Cidade:</span>
                                      <span className="ml-2 font-medium">
                                        {debito.cidade}/{debito.uf}
                                      </span>
                                    </div>
                                    {debito.tipoDevedor && (
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground">Tipo:</span>
                                        <span className="ml-2 font-medium">{debito.tipoDevedor.titulo}</span>
                                        {debito.tipoDevedor.descricao && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {debito.tipoDevedor.descricao}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* Score Recupere */}
                  {selectedAnalysis.assertiva_data.recupere?.resposta?.score && (
                    <Card className="border-l-4 border-purple-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                          <TrendingUp className="h-5 w-5" />
                          Score Recupere
                        </CardTitle>
                        <CardDescription>Probabilidade de negociação e recuperação</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-5xl font-bold text-purple-600 dark:text-purple-400">
                                {selectedAnalysis.assertiva_data.recupere.resposta.score.pontos}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Classe {selectedAnalysis.assertiva_data.recupere.resposta.score.classe}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-base px-4 py-2 border-purple-500 text-purple-700 dark:text-purple-300"
                            >
                              {selectedAnalysis.assertiva_data.recupere.resposta.score.faixa?.titulo}
                            </Badge>
                          </div>
                          {selectedAnalysis.assertiva_data.recupere.resposta.score.faixa?.descricao && (
                            <p className="text-sm text-muted-foreground border-l-2 border-purple-300 pl-3">
                              {selectedAnalysis.assertiva_data.recupere.resposta.score.faixa.descricao}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Protestos */}
                  {selectedAnalysis.assertiva_data.credito?.resposta?.protestosPublicos && (
                    <Card className="border-l-4 border-orange-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                          <FileText className="h-5 w-5" />
                          Protestos Públicos (
                          {selectedAnalysis.assertiva_data.credito.resposta.protestosPublicos.qtdProtestos || 0})
                        </CardTitle>
                        {selectedAnalysis.assertiva_data.credito.resposta.protestosPublicos.qtdProtestos > 0 && (
                          <CardDescription>
                            Total:{" "}
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(
                              Number.parseFloat(
                                selectedAnalysis.assertiva_data.credito.resposta.protestosPublicos.valorTotal,
                              ) || 0,
                            )}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        {selectedAnalysis.assertiva_data.credito.resposta.protestosPublicos.list &&
                        selectedAnalysis.assertiva_data.credito.resposta.protestosPublicos.list.length > 0 ? (
                          <div className="space-y-3">
                            {selectedAnalysis.assertiva_data.credito.resposta.protestosPublicos.list.map(
                              (protesto: any, idx: number) => (
                                <div key={idx} className="border rounded-lg p-4 space-y-2">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-semibold">{protesto.cartorio}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {protesto.cidade}/{protesto.uf}
                                      </p>
                                    </div>
                                    <p className="text-lg font-bold text-orange-600">
                                      {new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      }).format(protesto.valor || 0)}
                                    </p>
                                  </div>
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Data:</span>
                                    <span className="ml-2 font-medium">{protesto.data}</span>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">Nenhum protesto registrado</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Cheques */}
                  {selectedAnalysis.assertiva_data.credito?.resposta?.cheques?.list &&
                    selectedAnalysis.assertiva_data.credito.resposta.cheques.list.length > 0 && (
                      <Card className="border-l-4 border-amber-500">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <CreditCard className="h-5 w-5" />
                            Cheques sem Fundo (
                            {selectedAnalysis.assertiva_data.credito.resposta.cheques.qtdCheques || 0})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {selectedAnalysis.assertiva_data.credito.resposta.cheques.list.map(
                              (cheque: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center border-b pb-2">
                                  <div>
                                    <p className="font-medium">Banco: {cheque.banco}</p>
                                    <p className="text-sm text-muted-foreground">Agência: {cheque.agencia}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-amber-600">
                                      {new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      }).format(cheque.valor || 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{cheque.data}</p>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </>
              )}

              {!selectedAnalysis.assertiva_data && (
                <Card className="border-2 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Análise Não Realizada</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Esta análise ainda não foi executada ou os dados não estão disponíveis.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Government Data Sections */}
              {selectedAnalysis.data && (
                <>
                  {/* CEIS Sanctions */}
                  {selectedAnalysis.data.sancoes_ceis &&
                    Array.isArray(selectedAnalysis.data.sancoes_ceis) &&
                    selectedAnalysis.data.sancoes_ceis.length > 0 && (
                      <Card className="border-l-4 border-red-500">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-5 w-5" />
                            Sanções CEIS
                          </CardTitle>
                          <CardDescription>Cadastro de Empresas Inidôneas e Suspensas</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {selectedAnalysis.data.sancoes_ceis.map((sancao: any, index: number) => (
                              <div key={index} className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-semibold text-red-900 dark:text-red-100">
                                        {sancao.fonteSancao?.nomeExibicao ||
                                          sancao.orgaoSancionador ||
                                          "Órgão não informado"}
                                      </p>
                                      {sancao.tipoSancao && (
                                        <Badge variant="destructive" className="mt-1">
                                          {sancao.tipoSancao}
                                        </Badge>
                                      )}
                                    </div>
                                    {sancao.dataPublicacao && (
                                      <p className="text-sm text-red-700 dark:text-red-300">
                                        {new Date(sancao.dataPublicacao).toLocaleDateString("pt-BR")}
                                      </p>
                                    )}
                                  </div>
                                  {sancao.fundamentacaoLegal && (
                                    <p className="text-sm text-red-800 dark:text-red-200">
                                      <span className="font-medium">Fundamentação:</span> {sancao.fundamentacaoLegal}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {/* CNEP Punishments */}
                  {selectedAnalysis.data.punicoes_cnep &&
                    Array.isArray(selectedAnalysis.data.punicoes_cnep) &&
                    selectedAnalysis.data.punicoes_cnep.length > 0 && (
                      <Card className="border-l-4 border-orange-500">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                            <AlertCircle className="h-5 w-5" />
                            Punições CNEP
                          </CardTitle>
                          <CardDescription>Cadastro Nacional de Empresas Punidas</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {selectedAnalysis.data.punicoes_cnep.map((punicao: any, index: number) => (
                              <div key={index} className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-4">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-semibold text-orange-900 dark:text-orange-100">
                                        {punicao.orgaoSancionador?.nome || "Órgão não informado"}
                                      </p>
                                      {punicao.tipoSancao?.descricaoResumida && (
                                        <Badge
                                          variant="outline"
                                          className="mt-1 border-orange-500 text-orange-700 dark:text-orange-300"
                                        >
                                          {punicao.tipoSancao.descricaoResumida}
                                        </Badge>
                                      )}
                                    </div>
                                    {punicao.dataPublicacaoSancao && (
                                      <p className="text-sm text-orange-700 dark:text-orange-300">
                                        {new Date(punicao.dataPublicacaoSancao).toLocaleDateString("pt-BR")}
                                      </p>
                                    )}
                                  </div>
                                  {punicao.valorMulta && (
                                    <p className="text-sm text-orange-800 dark:text-orange-200">
                                      <span className="font-medium">Valor da Multa:</span> R${" "}
                                      {punicao.valorMulta.toLocaleString("pt-BR")}
                                    </p>
                                  )}
                                  {punicao.fundamentacaoLegal && (
                                    <p className="text-sm text-orange-800 dark:text-orange-200">
                                      <span className="font-medium">Fundamentação:</span> {punicao.fundamentacaoLegal}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  {selectedAnalysis.data.impedimentos_cepim &&
                    Array.isArray(selectedAnalysis.data.impedimentos_cepim) &&
                    selectedAnalysis.data.impedimentos_cepim.length > 0 && (
                      <Card className="border-l-4 border-purple-500">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                            <AlertTriangle className="h-5 w-5" />
                            Impedimentos CEPIM
                          </CardTitle>
                          <CardDescription>
                            Cadastro de Entidades Privadas sem Fins Lucrativos Impedidas
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {selectedAnalysis.data.impedimentos_cepim.map((impedimento: any, index: number) => (
                              <div key={index} className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-4">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-semibold text-purple-900 dark:text-purple-100">
                                        {impedimento.pessoaJuridica?.nome || impedimento.nome || "Nome não informado"}
                                      </p>
                                      {impedimento.orgaoVinculado?.nomeOrgaoVinculacao && (
                                        <Badge
                                          variant="outline"
                                          className="mt-1 border-purple-500 text-purple-700 dark:text-purple-300"
                                        >
                                          {impedimento.orgaoVinculado.nomeOrgaoVinculacao}
                                        </Badge>
                                      )}
                                    </div>
                                    {impedimento.dataReferencia && (
                                      <p className="text-sm text-purple-700 dark:text-purple-300">
                                        {impedimento.dataReferencia}
                                      </p>
                                    )}
                                  </div>
                                  {impedimento.motivoImpedimento && (
                                    <p className="text-sm text-purple-800 dark:text-purple-200">
                                      <span className="font-medium">Motivo:</span> {impedimento.motivoImpedimento}
                                    </p>
                                  )}
                                  {impedimento.convenio?.numeroConvenio && (
                                    <p className="text-sm text-purple-800 dark:text-purple-200">
                                      <span className="font-medium">Convênio:</span>{" "}
                                      {impedimento.convenio.numeroConvenio}
                                    </p>
                                  )}
                                  {impedimento.pessoaJuridica?.uf && (
                                    <p className="text-sm text-purple-800 dark:text-purple-200">
                                      <span className="font-medium">UF:</span> {impedimento.pessoaJuridica.uf}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </>
              )}

              {/* No Analysis Data */}
              {!selectedAnalysis.data && (
                <Card className="border-2 border-dashed">
                  <CardContent className="text-center text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-semibold">Análise Não Realizada</p>
                    <p className="text-sm mt-2">
                      Esta análise ainda não foi executada ou os dados não estão disponíveis.
                    </p>
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
