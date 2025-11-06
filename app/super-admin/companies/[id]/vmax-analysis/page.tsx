"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ArrowLeft, Play, CheckSquare, Eye, User, TrendingUp, FileDown } from "lucide-react"
import { runVMAXAnalysisAll, runVMAXAnalysisSelected } from "@/app/actions/credit-analysis"
import { getVMAXRecords, getCustomerDetails } from "@/app/actions/vmax-actions"

interface VMAXRecord {
  id: string
  "CPF/CNPJ": string
  Cliente: string
  Cidade: string
}

interface CustomerDetails {
  id: string
  name: string
  document: string
  city: string | null
  email: string | null
  phone: string | null
  created_at: string
  score: number | null
  analysis_data: any
  analysis_source: string | null
  assertiva_analysis: any
  assertiva_score: number | null
  assertiva_date: string | null
  gov_analysis: any
  gov_score: number | null
  gov_date: string | null
  analysis_history: Array<{
    id: string
    score: number
    source: string
    created_at: string
    data: any
  }>
}

export default function VMAXAnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.id as string

  const [vmaxRecords, setVmaxRecords] = useState<VMAXRecord[]>([])
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null)
  const [loadingCustomer, setLoadingCustomer] = useState(false)
  const [progress, setProgress] = useState<{
    current: number
    total: number
    analyzed: number
    cached: number
    failed: number
  } | null>(null)
  const [result, setResult] = useState<{
    success: boolean
    total: number
    analyzed: number
    cached: number
    failed: number
    duration: number
  } | null>(null)

  useEffect(() => {
    loadVMAXRecords()
  }, [companyId])

  async function loadVMAXRecords() {
    try {
      const response = await getVMAXRecords(companyId)

      if (response.success) {
        setVmaxRecords(response.data)
        console.log("[CLIENT] loadVMAXRecords - Loaded records:", response.data.length)
      } else {
        console.error("[CLIENT] loadVMAXRecords - Error:", response.error)
      }
    } catch (error) {
      console.error("[CLIENT] loadVMAXRecords - Error:", error)
    } finally {
      setLoading(false)
    }
  }

  async function viewCustomerDetails(vmaxId: string) {
    setLoadingCustomer(true)
    try {
      console.log("[v0] viewCustomerDetails - Loading for VMAX ID:", vmaxId)
      const response = await getCustomerDetails(vmaxId)
      console.log("[v0] viewCustomerDetails - Response:", response)
      if (response.success) {
        console.log("[v0] viewCustomerDetails - Customer data:", response.data)
        console.log("[v0] viewCustomerDetails - Score:", response.data.score)
        console.log("[v0] viewCustomerDetails - Analysis data keys:", Object.keys(response.data.analysis_data || {}))
        setSelectedCustomer(response.data)
      } else {
        alert(`Erro ao carregar detalhes: ${response.error}`)
      }
    } catch (error: any) {
      console.error("[v0] viewCustomerDetails - Error:", error)
      alert(`Erro: ${error.message}`)
    } finally {
      setLoadingCustomer(false)
    }
  }

  function toggleRecord(recordId: string) {
    const newSelected = new Set(selectedRecords)
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId)
    } else {
      newSelected.add(recordId)
    }
    setSelectedRecords(newSelected)
  }

  function toggleAll() {
    if (selectedRecords.size === vmaxRecords.length) {
      setSelectedRecords(new Set())
    } else {
      setSelectedRecords(new Set(vmaxRecords.map((r) => r.id)))
    }
  }

  async function runAnalysisAll() {
    setAnalyzing(true)
    setResult(null)
    setProgress({ current: 0, total: vmaxRecords.length, analyzed: 0, cached: 0, failed: 0 })

    try {
      const response = await runVMAXAnalysisAll(companyId)

      if (response.success) {
        setResult({
          success: true,
          total: response.total || 0,
          analyzed: response.analyzed || 0,
          cached: response.cached || 0,
          failed: response.failed || 0,
          duration: response.duration || 0,
        })
      } else {
        alert(`Erro: ${response.error}`)
      }
    } catch (error: any) {
      console.error("Error running analysis:", error)
      alert(`Erro: ${error.message}`)
    } finally {
      setAnalyzing(false)
      setProgress(null)
      loadVMAXRecords()
    }
  }

  async function runAnalysisSelected() {
    if (selectedRecords.size === 0) {
      alert("Selecione pelo menos um registro")
      return
    }

    setAnalyzing(true)
    setResult(null)
    setProgress({ current: 0, total: selectedRecords.size, analyzed: 0, cached: 0, failed: 0 })

    try {
      const response = await runVMAXAnalysisSelected(companyId, Array.from(selectedRecords))

      if (!response) {
        alert("Erro: Resposta vazia do servidor. Tente novamente.")
        return
      }

      if (!response.success) {
        alert(`Erro: ${response.error || "Erro desconhecido"}`)
        return
      }

      setResult({
        success: true,
        total: response.total || 0,
        analyzed: response.analyzed || 0,
        cached: response.cached || 0,
        failed: response.failed || 0,
        duration: response.duration || 0,
      })
    } catch (error: any) {
      console.error("Error running analysis:", error)
      alert(`Erro: ${error.message || "Erro desconhecido"}`)
    } finally {
      setAnalyzing(false)
      setProgress(null)
      setSelectedRecords(new Set())
      loadVMAXRecords()
    }
  }

  async function exportToPDF() {
    if (!selectedCustomer) return

    try {
      console.log("[v0] exportToPDF - Starting for customer:", selectedCustomer.id)

      if (!selectedCustomer.analysis_data) {
        alert("Nenhum dado de análise disponível para este cliente. Execute a análise primeiro.")
        return
      }

      const response = await fetch("/api/export-analysis-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: selectedCustomer.name,
            document: selectedCustomer.document,
            city: selectedCustomer.city,
            email: selectedCustomer.email,
            phone: selectedCustomer.phone,
          },
          score: selectedCustomer.score,
          source: "gov",
          analysis_type: "free",
          data: selectedCustomer.analysis_data,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] exportToPDF - API error:", response.status, errorText)
        throw new Error(`Erro ao gerar PDF (${response.status})`)
      }

      const html = await response.text()
      const printWindow = window.open("", "_blank", "width=1200,height=800")

      if (!printWindow) {
        alert("Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.")
        return
      }

      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()

      console.log("[v0] exportToPDF - Success - Window opened with PDF content")
    } catch (error: any) {
      console.error("[v0] exportToPDF - Error:", error)
      alert(`Erro ao exportar PDF: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Análise VMAX</h1>
          <p className="text-muted-foreground">
            Selecione os registros para executar análise de crédito gratuita (Portal da Transparência)
          </p>
        </div>
      </div>

      {result && (
        <Card className="p-6 mb-6 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <h3 className="font-semibold text-lg mb-4 text-foreground">Análise Concluída</h3>

          {result.analyzed === 0 && result.cached > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-foreground">
                ℹ️ <strong>Todos os registros já foram analisados anteriormente</strong> e estão salvos no banco de dados
                (em cache). Nenhuma nova análise foi necessária.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">{result.total}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Analisados Agora</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.analyzed}</p>
              <p className="text-xs text-muted-foreground">Novos</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Em Cache</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{result.cached}</p>
              <p className="text-xs text-muted-foreground">Já analisados</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Falharam</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.failed}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duração</p>
              <p className="text-2xl font-bold text-foreground">{Math.round(result.duration / 1000)}s</p>
            </div>
          </div>
        </Card>
      )}

      {progress && (
        <Card className="p-6 mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-4">
            <Spinner className="h-6 w-6" />
            <div className="flex-1">
              <p className="font-semibold mb-2 text-foreground">Processando análises...</p>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Progresso:</span>{" "}
                  <span className="font-semibold text-foreground">
                    {progress.current}/{progress.total}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Analisados:</span>{" "}
                  <span className="font-semibold text-green-600 dark:text-green-400">{progress.analyzed}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Cache:</span>{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{progress.cached}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Falhas:</span>{" "}
                  <span className="font-semibold text-red-600 dark:text-red-400">{progress.failed}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Aguardando 15 segundos entre cada requisição para evitar bloqueio da API...
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={toggleAll} disabled={analyzing}>
            <CheckSquare className="h-4 w-4 mr-2" />
            {selectedRecords.size === vmaxRecords.length ? "Desmarcar Todos" : "Selecionar Todos"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {selectedRecords.size} de {vmaxRecords.length} selecionados
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAnalysisSelected} disabled={analyzing || selectedRecords.size === 0}>
            <Play className="h-4 w-4 mr-2" />
            Analisar Selecionados ({selectedRecords.size})
          </Button>
          <Button onClick={runAnalysisAll} disabled={analyzing} variant="default">
            <Play className="h-4 w-4 mr-2" />
            Analisar Todos ({vmaxRecords.length})
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr className="text-left">
                <th className="p-4 w-12">
                  <Checkbox checked={selectedRecords.size === vmaxRecords.length} onCheckedChange={toggleAll} />
                </th>
                <th className="p-4 font-semibold text-foreground">CPF/CNPJ</th>
                <th className="p-4 font-semibold text-foreground">Cliente</th>
                <th className="p-4 font-semibold text-foreground">Cidade</th>
                <th className="p-4 font-semibold text-foreground">Tipo</th>
                <th className="p-4 font-semibold text-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vmaxRecords.map((record) => {
                const document = record["CPF/CNPJ"]?.replace(/\D/g, "")
                const isCnpj = document?.length === 14
                const isSelected = selectedRecords.has(record.id)

                return (
                  <tr
                    key={record.id}
                    className={`border-b hover:bg-muted/50 transition-colors ${isSelected ? "bg-primary/10" : ""}`}
                  >
                    <td className="p-4">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleRecord(record.id)} />
                    </td>
                    <td className="p-4 font-mono text-sm text-foreground">{record["CPF/CNPJ"]}</td>
                    <td className="p-4 text-foreground">{record.Cliente}</td>
                    <td className="p-4 text-foreground">{record.Cidade}</td>
                    <td className="p-4">
                      <Badge variant={isCnpj ? "secondary" : "default"}>{isCnpj ? "CNPJ" : "CPF"}</Badge>
                    </td>
                    <td className="p-4">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => viewCustomerDetails(record.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto bg-background">
                          <SheetHeader className="pb-6 border-b border-border px-6 pt-6">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <SheetTitle className="text-2xl font-bold text-foreground">
                                  Análise de Crédito Completa
                                </SheetTitle>
                                <SheetDescription className="text-base text-muted-foreground mt-1">
                                  Dados do Portal da Transparência do Governo Federal
                                </SheetDescription>
                              </div>
                              {!loadingCustomer && selectedCustomer && selectedCustomer.score !== null && (
                                <Button
                                  onClick={exportToPDF}
                                  variant="default"
                                  size="lg"
                                  className="shrink-0 bg-altea-gold hover:bg-altea-gold/90 text-altea-navy font-semibold shadow-lg hover:shadow-xl transition-all"
                                >
                                  <FileDown className="h-5 w-5 mr-2" />
                                  Exportar PDF
                                </Button>
                              )}
                            </div>
                          </SheetHeader>

                          {loadingCustomer ? (
                            <div className="flex items-center justify-center py-20">
                              <div className="text-center space-y-4">
                                <Spinner className="h-10 w-10 mx-auto text-primary" />
                                <p className="text-muted-foreground">Carregando análise completa...</p>
                              </div>
                            </div>
                          ) : !selectedCustomer ? (
                            <div className="text-center py-20">
                              <p className="text-muted-foreground">Nenhum dado encontrado</p>
                            </div>
                          ) : (
                            <div className="mt-6 space-y-6 px-6 pb-6">
                              {/* Source Indicator */}
                              {selectedCustomer.assertiva_analysis && (
                                <Card className="border-2 border-altea-gold bg-gradient-to-r from-altea-gold/10 to-altea-gold/5">
                                  <div className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-altea-gold/20">
                                          <TrendingUp className="h-5 w-5 text-altea-gold" />
                                        </div>
                                        <div>
                                          <h3 className="font-semibold text-lg text-foreground">
                                            Análise Completa - Assertiva Soluções
                                          </h3>
                                          <p className="text-sm text-muted-foreground">
                                            Dados detalhados de crédito e comportamento financeiro
                                          </p>
                                        </div>
                                      </div>
                                      <Badge className="bg-altea-gold text-altea-navy font-semibold">
                                        Análise Premium
                                      </Badge>
                                    </div>
                                  </div>
                                </Card>
                              )}

                              {!selectedCustomer.assertiva_analysis && selectedCustomer.gov_analysis && (
                                <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                                  <div className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                          <h3 className="font-semibold text-lg text-foreground">
                                            Análise Gratuita - Portal da Transparência
                                          </h3>
                                          <p className="text-sm text-muted-foreground">
                                            Dados públicos do Governo Federal
                                          </p>
                                        </div>
                                      </div>
                                      <Badge variant="secondary">Análise Básica</Badge>
                                    </div>
                                  </div>
                                </Card>
                              )}

                              {selectedCustomer.score !== null && selectedCustomer.score !== undefined ? (
                                <>
                                  {/* Summary Cards Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* Score Card */}
                                    <Card className="col-span-1 md:col-span-2 border-2 bg-gradient-to-br from-altea-gold/10 to-altea-gold/5 dark:from-altea-gold/20 dark:to-altea-gold/10">
                                      <div className="p-6">
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <p className="text-sm text-muted-foreground mb-2">Score de Crédito</p>
                                            <p className="text-5xl font-bold text-altea-gold mb-2">
                                              {selectedCustomer.score}
                                            </p>
                                            <Badge
                                              variant={
                                                selectedCustomer.score >= 700
                                                  ? "default"
                                                  : selectedCustomer.score >= 500
                                                    ? "secondary"
                                                    : "destructive"
                                              }
                                              className="text-sm"
                                            >
                                              {selectedCustomer.score >= 700
                                                ? "Baixo Risco"
                                                : selectedCustomer.score >= 500
                                                  ? "Risco Moderado"
                                                  : "Alto Risco"}
                                            </Badge>
                                            <p className="text-xs text-muted-foreground mt-2">
                                              Fonte:{" "}
                                              {selectedCustomer.analysis_source === "assertiva"
                                                ? "Assertiva Soluções"
                                                : "Portal da Transparência"}
                                            </p>
                                          </div>
                                          <TrendingUp className="h-16 w-16 text-altea-gold/30" />
                                        </div>
                                      </div>
                                    </Card>

                                    {/* Metric Cards - Different for Assertiva vs Gov */}
                                    {selectedCustomer.assertiva_analysis ? (
                                      <>
                                        <Card className="border-2">
                                          <div className="p-6">
                                            <p className="text-sm text-muted-foreground mb-2">Protestos</p>
                                            <p className="text-3xl font-bold text-foreground">
                                              {selectedCustomer.assertiva_analysis?.protestos?.length || 0}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">Títulos Protestados</p>
                                          </div>
                                        </Card>

                                        <Card className="border-2">
                                          <div className="p-6">
                                            <p className="text-sm text-muted-foreground mb-2">Ações Judiciais</p>
                                            <p className="text-3xl font-bold text-foreground">
                                              {selectedCustomer.assertiva_analysis?.acoes_judiciais?.length || 0}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">Processos Ativos</p>
                                          </div>
                                        </Card>
                                      </>
                                    ) : (
                                      <>
                                        <Card className="border-2">
                                          <div className="p-6">
                                            <p className="text-sm text-muted-foreground mb-2">Sanções CEIS</p>
                                            <p className="text-3xl font-bold text-foreground">
                                              {selectedCustomer.analysis_data?.sancoes_ceis?.length || 0}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">Empresas Inidôneas</p>
                                          </div>
                                        </Card>

                                        <Card className="border-2">
                                          <div className="p-6">
                                            <p className="text-sm text-muted-foreground mb-2">Punições CNEP</p>
                                            <p className="text-3xl font-bold text-foreground">
                                              {selectedCustomer.analysis_data?.punicoes_cnep?.length || 0}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">Empresas Punidas</p>
                                          </div>
                                        </Card>
                                      </>
                                    )}
                                  </div>

                                  {/* Customer Information Card */}
                                  <Card className="border-2">
                                    <div className="p-6">
                                      <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-lg bg-altea-navy/10 dark:bg-altea-navy/20">
                                          <User className="h-5 w-5 text-altea-navy dark:text-altea-gold" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-foreground">
                                          Informações do Cliente
                                        </h3>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            Nome Completo
                                          </p>
                                          <p className="text-base font-semibold text-foreground">
                                            {selectedCustomer.name}
                                          </p>
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            CPF/CNPJ
                                          </p>
                                          <p className="text-base font-mono font-semibold text-foreground">
                                            {selectedCustomer.document}
                                          </p>
                                        </div>
                                        {selectedCustomer.city && (
                                          <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                              Cidade
                                            </p>
                                            <p className="text-base font-semibold text-foreground">
                                              {selectedCustomer.city}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </Card>

                                  {/* Assertiva-specific sections */}
                                  {selectedCustomer.assertiva_analysis && (
                                    <>
                                      {/* Renda Presumida */}
                                      {selectedCustomer.assertiva_analysis.renda_presumida && (
                                        <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                                          <div className="p-6">
                                            <div className="flex items-center gap-3 mb-4">
                                              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                                <span className="text-2xl">💰</span>
                                              </div>
                                              <div>
                                                <h3 className="font-semibold text-lg text-green-700 dark:text-green-400">
                                                  Renda Presumida
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                  Estimativa baseada em dados comportamentais
                                                </p>
                                              </div>
                                            </div>
                                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                              R${" "}
                                              {Number(
                                                selectedCustomer.assertiva_analysis.renda_presumida,
                                              ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                            </p>
                                          </div>
                                        </Card>
                                      )}

                                      {/* Protestos */}
                                      {selectedCustomer.assertiva_analysis.protestos &&
                                        Array.isArray(selectedCustomer.assertiva_analysis.protestos) &&
                                        selectedCustomer.assertiva_analysis.protestos.length > 0 && (
                                          <Card className="border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                                            <div className="p-6">
                                              <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                                  <span className="text-2xl">⚠️</span>
                                                </div>
                                                <div>
                                                  <h3 className="font-semibold text-lg text-red-700 dark:text-red-400">
                                                    Protestos Registrados
                                                  </h3>
                                                  <p className="text-sm text-muted-foreground">
                                                    {selectedCustomer.assertiva_analysis.protestos.length} protesto(s)
                                                    encontrado(s)
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="space-y-4">
                                                {selectedCustomer.assertiva_analysis.protestos.map(
                                                  (protesto: any, idx: number) => (
                                                    <div
                                                      key={idx}
                                                      className="bg-white dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-lg p-5"
                                                    >
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {protesto.cartorio && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Cartório
                                                            </p>
                                                            <p className="font-semibold text-foreground">
                                                              {protesto.cartorio}
                                                            </p>
                                                          </div>
                                                        )}
                                                        {protesto.valor && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Valor
                                                            </p>
                                                            <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                                              R${" "}
                                                              {Number(protesto.valor).toLocaleString("pt-BR", {
                                                                minimumFractionDigits: 2,
                                                              })}
                                                            </p>
                                                          </div>
                                                        )}
                                                        {protesto.data && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Data
                                                            </p>
                                                            <p className="font-semibold text-foreground">
                                                              {protesto.data}
                                                            </p>
                                                          </div>
                                                        )}
                                                        {protesto.cidade && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Cidade
                                                            </p>
                                                            <p className="font-semibold text-foreground">
                                                              {protesto.cidade}
                                                            </p>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          </Card>
                                        )}

                                      {/* Ações Judiciais */}
                                      {selectedCustomer.assertiva_analysis.acoes_judiciais &&
                                        Array.isArray(selectedCustomer.assertiva_analysis.acoes_judiciais) &&
                                        selectedCustomer.assertiva_analysis.acoes_judiciais.length > 0 && (
                                          <Card className="border-2 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                                            <div className="p-6">
                                              <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                                  <span className="text-2xl">⚖️</span>
                                                </div>
                                                <div>
                                                  <h3 className="font-semibold text-lg text-orange-700 dark:text-orange-400">
                                                    Ações Judiciais
                                                  </h3>
                                                  <p className="text-sm text-muted-foreground">
                                                    {selectedCustomer.assertiva_analysis.acoes_judiciais.length}{" "}
                                                    ação(ões) encontrada(s)
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="space-y-4">
                                                {selectedCustomer.assertiva_analysis.acoes_judiciais.map(
                                                  (acao: any, idx: number) => (
                                                    <div
                                                      key={idx}
                                                      className="bg-white dark:bg-orange-950/30 border-2 border-orange-200 dark:border-orange-800 rounded-lg p-5"
                                                    >
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {acao.numero_processo && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Número do Processo
                                                            </p>
                                                            <p className="font-mono font-semibold text-foreground">
                                                              {acao.numero_processo}
                                                            </p>
                                                          </div>
                                                        )}
                                                        {acao.tipo && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Tipo
                                                            </p>
                                                            <p className="font-semibold text-foreground">{acao.tipo}</p>
                                                          </div>
                                                        )}
                                                        {acao.valor && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Valor
                                                            </p>
                                                            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                                              R${" "}
                                                              {Number(acao.valor).toLocaleString("pt-BR", {
                                                                minimumFractionDigits: 2,
                                                              })}
                                                            </p>
                                                          </div>
                                                        )}
                                                        {acao.data && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Data
                                                            </p>
                                                            <p className="font-semibold text-foreground">{acao.data}</p>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          </Card>
                                        )}
                                    </>
                                  )}

                                  {/* Government Data sections */}
                                  {selectedCustomer.gov_analysis && (
                                    <>
                                      {/* Sanções CEIS */}
                                      {selectedCustomer.analysis_data?.sancoes_ceis &&
                                        Array.isArray(selectedCustomer.analysis_data.sancoes_ceis) &&
                                        selectedCustomer.analysis_data.sancoes_ceis.length > 0 && (
                                          <Card className="border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                                            <div className="p-6">
                                              <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                                  <span className="text-2xl">🚫</span>
                                                </div>
                                                <div>
                                                  <h3 className="font-semibold text-lg text-red-700 dark:text-red-400">
                                                    Sanções CEIS
                                                  </h3>
                                                  <p className="text-sm text-muted-foreground">
                                                    Cadastro de Empresas Inidôneas e Suspensas
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="space-y-4">
                                                {selectedCustomer.analysis_data.sancoes_ceis.map(
                                                  (sancao: any, idx: number) => (
                                                    <div
                                                      key={idx}
                                                      className="bg-white dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-lg p-5"
                                                    >
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {sancao.orgao_sancionador && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Órgão Sancionador
                                                            </p>
                                                            <p className="font-semibold text-foreground">
                                                              {sancao.orgao_sancionador}
                                                            </p>
                                                          </div>
                                                        )}
                                                        {sancao.tipo_sancao && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Tipo de Sanção
                                                            </p>
                                                            <Badge variant="destructive">{sancao.tipo_sancao}</Badge>
                                                          </div>
                                                        )}
                                                        {sancao.data_inicio && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Data Início
                                                            </p>
                                                            <p className="font-semibold text-foreground">
                                                              {new Date(sancao.data_inicio).toLocaleDateString("pt-BR")}
                                                            </p>
                                                          </div>
                                                        )}
                                                        {sancao.data_fim && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Data Fim
                                                            </p>
                                                            <p className="font-semibold text-foreground">
                                                              {new Date(sancao.data_fim).toLocaleDateString("pt-BR")}
                                                            </p>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          </Card>
                                        )}

                                      {/* Punições CNEP */}
                                      {selectedCustomer.analysis_data?.punicoes_cnep &&
                                        Array.isArray(selectedCustomer.analysis_data.punicoes_cnep) &&
                                        selectedCustomer.analysis_data.punicoes_cnep.length > 0 && (
                                          <Card className="border-2 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                                            <div className="p-6">
                                              <div className="flex items-center gap-3 mb-6">
                                                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                                  <span className="text-2xl">⚠️</span>
                                                </div>
                                                <div>
                                                  <h3 className="font-semibold text-lg text-orange-700 dark:text-orange-400">
                                                    Punições CNEP
                                                  </h3>
                                                  <p className="text-sm text-muted-foreground">
                                                    Cadastro Nacional de Empresas Punidas
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="space-y-4">
                                                {selectedCustomer.analysis_data.punicoes_cnep.map(
                                                  (punicao: any, idx: number) => (
                                                    <div
                                                      key={idx}
                                                      className="bg-white dark:bg-orange-950/30 border-2 border-orange-200 dark:border-orange-800 rounded-lg p-5"
                                                    >
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {punicao.orgao_sancionador && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Órgão Sancionador
                                                            </p>
                                                            <p className="font-semibold text-foreground">
                                                              {punicao.orgao_sancionador}
                                                            </p>
                                                          </div>
                                                        )}
                                                        {punicao.tipo_sancao && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Tipo de Sanção
                                                            </p>
                                                            <Badge variant="secondary">{punicao.tipo_sancao}</Badge>
                                                          </div>
                                                        )}
                                                        {punicao.data_inicio && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Data Início
                                                            </p>
                                                            <p className="font-semibold text-foreground">
                                                              {new Date(punicao.data_inicio).toLocaleDateString(
                                                                "pt-BR",
                                                              )}
                                                            </p>
                                                          </div>
                                                        )}
                                                        {punicao.data_fim && (
                                                          <div className="space-y-1">
                                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                              Data Fim
                                                            </p>
                                                            <p className="font-semibold text-foreground">
                                                              {new Date(punicao.data_fim).toLocaleDateString("pt-BR")}
                                                            </p>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          </Card>
                                        )}
                                    </>
                                  )}
                                </>
                              ) : (
                                <Card className="border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
                                  <div className="p-8 text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
                                      <span className="text-3xl">📊</span>
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">
                                      Análise Não Realizada
                                    </h3>
                                    <p className="text-muted-foreground mb-4">
                                      Este cliente ainda não possui análise de crédito. Execute a análise para
                                      visualizar os dados.
                                    </p>
                                    <Button
                                      onClick={() => {
                                        setSelectedCustomer(null)
                                      }}
                                      variant="outline"
                                    >
                                      Fechar
                                    </Button>
                                  </div>
                                </Card>
                              )}
                            </div>
                          )}
                        </SheetContent>
                      </Sheet>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
