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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { runAssertivaManualAnalysis } from "@/app/actions/credit-actions"
import { getAnalysesData } from "@/app/actions/analyses-actions"
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
}

export default function AnalysesPage() {
  const [analyses, setAnalyses] = useState<CreditAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSource, setFilterSource] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false)
  const [selectedAnalysis, setSelectedAnalysis] = useState<CreditAnalysis | null>(null)
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = async () => {
    try {
      console.log("[CLIENT][v0] AnalysesPage - Loading analyses...")
      setLoading(true)

      const response = await getAnalysesData()

      if (response.success) {
        setAnalyses(response.data)
        console.log("[CLIENT][v0] AnalysesPage - Loaded analyses:", response.data.length)
      } else {
        console.error("[CLIENT][v0] AnalysesPage - Error:", response.error)
        toast({
          title: "Erro ao carregar análises",
          description: response.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[CLIENT][v0] AnalysesPage - Error loading analyses:", error)
      toast({
        title: "Erro ao carregar análises",
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

    return matchesSearch && matchesSource && matchesType
  })

  const getSourceBadge = (source: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      gov: { variant: "secondary", label: "Governo" },
      assertiva: { variant: "default", label: "Assertiva" },
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
    assertiva: analyses.filter((a) => a.source === "assertiva").length,
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

  const viewAnalysisDetails = (analysis: CreditAnalysis) => {
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
    <div className="space-y-6">
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
            <CardDescription className="text-muted-foreground">Assertiva</CardDescription>
            <CardTitle className="text-3xl text-blue-600 dark:text-blue-400">{stats.assertiva}</CardTitle>
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
                  <h3 className="text-lg font-semibold text-foreground">Análise Paga (Assertiva)</h3>
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, CPF ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Fontes</SelectItem>
                  <SelectItem value="gov">Governo</SelectItem>
                  <SelectItem value="assertiva">Assertiva</SelectItem>
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
                      <TableCell>
                        <span className={`font-semibold ${getScoreColor(analysis.score)}`}>
                          {analysis.score || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>{getSourceBadge(analysis.source)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{analysis.analysis_type === "free" ? "Gratuita" : "Detalhada"}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(analysis.status)}</TableCell>
                      <TableCell>{new Date(analysis.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewAnalysisDetails(analysis)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
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
              Confirmar Análise Paga
            </DialogTitle>
            <div className="space-y-4 pt-4 text-sm text-muted-foreground">
              <p>Você está prestes a executar uma análise detalhada usando a API da Assertiva Soluções.</p>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:bg-yellow-950/20">
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">⚠️ Atenção:</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                  <li>Esta ação consome créditos da Assertiva</li>
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

      {/* Details Drawer */}
      <Sheet open={showDetailsDrawer} onOpenChange={setShowDetailsDrawer}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto bg-background">
          <SheetHeader>
            <SheetTitle className="text-2xl">Análise de Crédito Completa</SheetTitle>
            <SheetDescription>
              {selectedAnalysis?.source === "assertiva"
                ? "Dados da Assertiva Soluções"
                : "Dados do Portal da Transparência do Governo Federal"}
            </SheetDescription>
          </SheetHeader>

          {selectedAnalysis && (
            <div className="space-y-6 mt-6 px-6">
              {/* Source Badge */}
              <div className="flex items-center justify-between">
                <Badge
                  variant={selectedAnalysis.source === "assertiva" ? "default" : "secondary"}
                  className="text-base px-6 py-2"
                >
                  {selectedAnalysis.source === "assertiva" ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Análise Detalhada - Assertiva
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Análise Gratuita - Portal da Transparência
                    </span>
                  )}
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
                        selectedAnalysis.score ||
                          selectedAnalysis.data?.score_credito?.pontos ||
                          selectedAnalysis.data?.credito?.resposta?.score?.pontos ||
                          null,
                      )}`}
                    >
                      {selectedAnalysis.score ||
                        selectedAnalysis.data?.score_credito?.pontos ||
                        selectedAnalysis.data?.credito?.resposta?.score?.pontos ||
                        "N/A"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedAnalysis.score >= 700
                        ? "Risco Baixo"
                        : selectedAnalysis.score >= 500
                          ? "Risco Moderado"
                          : selectedAnalysis.score >= 300
                            ? "Risco Alto"
                            : "Risco Muito Alto"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fonte: {selectedAnalysis.source === "assertiva" ? "Assertiva" : "Portal da Transparência"}
                    </p>
                  </CardHeader>
                </Card>

                {/* Sanctions Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs uppercase tracking-wide">Sanções CEIS</CardDescription>
                    <CardTitle className="text-5xl font-bold text-red-600 dark:text-red-400">
                      {selectedAnalysis.data?.sancoes_ceis?.length || 0}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Empresas Inidôneas</p>
                  </CardHeader>
                </Card>

                {/* Punishments Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription className="text-xs uppercase tracking-wide">Punições CNEP</CardDescription>
                    <CardTitle className="text-5xl font-bold text-orange-600 dark:text-orange-400">
                      {selectedAnalysis.data?.punicoes_cnep?.length || 0}
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
                      <p className="text-lg font-semibold">{selectedAnalysis.cpf}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assertiva Specific Sections */}
              {selectedAnalysis.source === "assertiva" && selectedAnalysis.data && (
                <>
                  {/* Score Recupere */}
                  {(selectedAnalysis.data.score_recupere || selectedAnalysis.data.recupere?.resposta?.score) && (
                    <Card className="border-l-4 border-green-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <TrendingUp className="h-5 w-5" />
                          Score Recupere
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                              {selectedAnalysis.data.score_recupere?.pontos ||
                                selectedAnalysis.data.recupere?.resposta?.score?.pontos}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Classe:{" "}
                              {selectedAnalysis.data.score_recupere?.classe ||
                                selectedAnalysis.data.recupere?.resposta?.score?.classe}
                            </p>
                          </div>
                          <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-300">
                            {selectedAnalysis.data.score_recupere?.faixa?.titulo ||
                              selectedAnalysis.data.recupere?.resposta?.score?.faixa?.titulo ||
                              "Índice de Recuperação"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Renda Presumida */}
                  {(selectedAnalysis.data.renda_presumida ||
                    selectedAnalysis.data.credito?.resposta?.rendaPresumida) && (
                    <Card className="border-l-4 border-blue-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <TrendingUp className="h-5 w-5" />
                          Renda Presumida
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                          R${" "}
                          {(
                            selectedAnalysis.data.renda_presumida?.valor ||
                            selectedAnalysis.data.credito?.resposta?.rendaPresumida?.valor ||
                            0
                          ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Débitos */}
                  {(selectedAnalysis.data.debitos || selectedAnalysis.data.credito?.resposta?.registrosDebitos) && (
                    <Card className="border-l-4 border-orange-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                          <AlertCircle className="h-5 w-5" />
                          Débitos (
                          {
                            (
                              selectedAnalysis.data.debitos?.list ||
                              selectedAnalysis.data.credito?.resposta?.registrosDebitos?.list ||
                              []
                            ).length
                          }
                          )
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(
                          selectedAnalysis.data.debitos?.list ||
                          selectedAnalysis.data.credito?.resposta?.registrosDebitos?.list ||
                          []
                        ).length > 0 ? (
                          <div className="space-y-3">
                            {(
                              selectedAnalysis.data.debitos?.list ||
                              selectedAnalysis.data.credito?.resposta?.registrosDebitos?.list ||
                              []
                            ).map((debito: any, index: number) => (
                              <div key={index} className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold text-orange-900 dark:text-orange-100">
                                      {debito.credor || "Credor não informado"}
                                    </p>
                                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                      R$ {(debito.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="rounded-lg border-2 border-orange-500 bg-orange-100 dark:bg-orange-900/30 p-4">
                              <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                                Total: R${" "}
                                {(
                                  selectedAnalysis.data.debitos?.valorTotal ||
                                  selectedAnalysis.data.credito?.resposta?.registrosDebitos?.valorTotal ||
                                  0
                                ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
                            <p className="text-sm text-green-800 dark:text-green-200">✅ Nenhum débito encontrado</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Protestos */}
                  {(selectedAnalysis.data.protestos || selectedAnalysis.data.credito?.resposta?.protestosPublicos) && (
                    <Card className="border-l-4 border-red-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-5 w-5" />
                          Protestos (
                          {
                            (
                              selectedAnalysis.data.protestos?.list ||
                              selectedAnalysis.data.credito?.resposta?.protestosPublicos?.list ||
                              []
                            ).length
                          }
                          )
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(
                          selectedAnalysis.data.protestos?.list ||
                          selectedAnalysis.data.credito?.resposta?.protestosPublicos?.list ||
                          []
                        ).length > 0 ? (
                          <div className="space-y-3">
                            {(
                              selectedAnalysis.data.protestos?.list ||
                              selectedAnalysis.data.credito?.resposta?.protestosPublicos?.list ||
                              []
                            ).map((protesto: any, index: number) => (
                              <div key={index} className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4">
                                <div className="space-y-2">
                                  <p className="font-semibold text-red-900 dark:text-red-100">
                                    {protesto.cartorio || "Cartório não informado"}
                                  </p>
                                  <p className="text-sm text-red-800 dark:text-red-200">
                                    Valor: R${" "}
                                    {(protesto.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </p>
                                  {protesto.data && (
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                      Data: {new Date(protesto.data).toLocaleDateString("pt-BR")}
                                    </p>
                                  )}
                                  {protesto.cidade && (
                                    <p className="text-sm text-red-700 dark:text-red-300">Cidade: {protesto.cidade}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
                            <p className="text-sm text-green-800 dark:text-green-200">✅ Nenhum protesto encontrado</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Ações Judiciais */}
                  {(selectedAnalysis.data.acoes_judiciais || selectedAnalysis.data.acoes?.resposta?.acoes) && (
                    <Card className="border-l-4 border-purple-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                          <FileText className="h-5 w-5" />
                          Ações Judiciais (
                          {
                            (
                              selectedAnalysis.data.acoes_judiciais?.list ||
                              selectedAnalysis.data.acoes?.resposta?.acoes ||
                              []
                            ).length
                          }
                          )
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(
                          selectedAnalysis.data.acoes_judiciais?.list ||
                          selectedAnalysis.data.acoes?.resposta?.acoes ||
                          []
                        ).length > 0 ? (
                          <div className="space-y-3">
                            {(
                              selectedAnalysis.data.acoes_judiciais?.list ||
                              selectedAnalysis.data.acoes?.resposta?.acoes ||
                              []
                            ).map((acao: any, index: number) => (
                              <div key={index} className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-4">
                                <div className="space-y-2">
                                  <p className="font-semibold text-purple-900 dark:text-purple-100">
                                    {acao.tribunal || "Tribunal não informado"}
                                  </p>
                                  {acao.processo && (
                                    <p className="text-sm text-purple-800 dark:text-purple-200">
                                      Processo: {acao.processo}
                                    </p>
                                  )}
                                  {acao.valorCausa && (
                                    <p className="text-sm text-purple-800 dark:text-purple-200">
                                      Valor da Causa: R${" "}
                                      {acao.valorCausa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
                            <p className="text-sm text-green-800 dark:text-green-200">
                              ✅ Nenhuma ação judicial encontrada
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
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
                </>
              )}

              {/* No Analysis Data */}
              {!selectedAnalysis.data && (
                <Card className="border-2 border-dashed">
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-semibold">Análise Não Realizada</p>
                      <p className="text-sm mt-2">
                        Esta análise ainda não foi executada ou os dados não estão disponíveis.
                      </p>
                    </div>
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
