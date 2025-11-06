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
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Search,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Loader2,
  Eye,
  ChevronDown,
  Building2,
  FileText,
  AlertTriangle,
  Briefcase,
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
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto bg-background">
          <SheetHeader>
            <SheetTitle>Detalhes da Análise</SheetTitle>
            <SheetDescription>Informações completas da análise de crédito</SheetDescription>
            <Button
              onClick={() => selectedAnalysis && exportToPDF(selectedAnalysis)}
              className="gap-2 mt-4"
              variant="outline"
            >
              <Download className="h-4 w-4" />
              Extrair PDF
            </Button>
          </SheetHeader>

          {selectedAnalysis && (
            <div className="space-y-6 mt-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Informações Básicas
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{selectedAnalysis.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                    <p className="font-medium">{selectedAnalysis.cpf}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Empresa</p>
                    <p className="font-medium">{selectedAnalysis.company_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data da Análise</p>
                    <p className="font-medium">{formatDate(selectedAnalysis.created_at)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Credit Score */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Score de Crédito
                </h3>
                <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Score Calculado</p>
                      <p className={`text-5xl font-bold ${getScoreColor(selectedAnalysis.score)}`}>
                        {selectedAnalysis.score || "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={selectedAnalysis.source === "assertiva" ? "default" : "secondary"}
                        className="mb-2"
                      >
                        {selectedAnalysis.source === "assertiva" ? "Assertiva" : "Governo"}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {selectedAnalysis.analysis_type === "free" ? "Análise Gratuita" : "Análise Detalhada"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Analysis Data */}
              {selectedAnalysis.data && (
                <>
                  {/* CEIS Sanctions */}
                  {selectedAnalysis.data.sancoes_ceis &&
                    Array.isArray(selectedAnalysis.data.sancoes_ceis) &&
                    selectedAnalysis.data.sancoes_ceis.length > 0 && (
                      <>
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Sanções CEIS ({selectedAnalysis.data.sancoes_ceis.length})
                          </h3>
                          <div className="space-y-3">
                            {selectedAnalysis.data.sancoes_ceis.map((sancao: any, index: number) => (
                              <div
                                key={index}
                                className="rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20 p-4"
                              >
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
                        </div>
                        <Separator />
                      </>
                    )}

                  {/* CNEP Punishments */}
                  {selectedAnalysis.data.punicoes_cnep &&
                    Array.isArray(selectedAnalysis.data.punicoes_cnep) &&
                    selectedAnalysis.data.punicoes_cnep.length > 0 && (
                      <>
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Punições CNEP ({selectedAnalysis.data.punicoes_cnep.length})
                          </h3>
                          <div className="space-y-3">
                            {selectedAnalysis.data.punicoes_cnep.map((punicao: any, index: number) => (
                              <div
                                key={index}
                                className="rounded-lg border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/20 p-4"
                              >
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
                        </div>
                        <Separator />
                      </>
                    )}

                  {/* Public Bonds */}
                  {selectedAnalysis.data.vinculos_publicos &&
                    Array.isArray(selectedAnalysis.data.vinculos_publicos) &&
                    selectedAnalysis.data.vinculos_publicos.length > 0 && (
                      <>
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Vínculos Públicos ({selectedAnalysis.data.vinculos_publicos.length})
                          </h3>
                          <div className="space-y-3">
                            {selectedAnalysis.data.vinculos_publicos.map((vinculo: any, index: number) => (
                              <div
                                key={index}
                                className="rounded-lg border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 p-4"
                              >
                                <div className="space-y-2">
                                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                                    {vinculo.orgao || "Órgão não informado"}
                                  </p>
                                  {vinculo.cargo && (
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                      <span className="font-medium">Cargo:</span> {vinculo.cargo}
                                    </p>
                                  )}
                                  {vinculo.dataInicio && (
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                      Desde {new Date(vinculo.dataInicio).toLocaleDateString("pt-BR")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                  {/* CPF Status */}
                  {selectedAnalysis.data.situacao_cpf && (
                    <>
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Situação do CPF/CNPJ
                        </h3>
                        <div className="rounded-lg border bg-muted/50 p-4">
                          <Badge variant={selectedAnalysis.data.situacao_cpf === "REGULAR" ? "default" : "destructive"}>
                            {selectedAnalysis.data.situacao_cpf}
                          </Badge>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Raw Data */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/50 p-4 hover:bg-muted">
                      <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Dados Completos da API
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <pre className="rounded-lg border bg-muted/50 p-4 text-xs overflow-x-auto">
                        {JSON.stringify(selectedAnalysis.data, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
