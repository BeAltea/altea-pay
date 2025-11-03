"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ArrowLeft, Play, CheckSquare, Eye, User, TrendingUp } from "lucide-react"
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
      setSelectedRecords(new Set())
      loadVMAXRecords()
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
                        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto bg-background">
                          <SheetHeader className="pb-6 border-b">
                            <SheetTitle className="text-2xl font-bold">Detalhes do Cliente</SheetTitle>
                            <SheetDescription className="text-base">
                              Análise completa baseada em dados do Portal da Transparência
                            </SheetDescription>
                          </SheetHeader>

                          {loadingCustomer ? (
                            <div className="flex items-center justify-center py-20">
                              <div className="text-center space-y-4">
                                <Spinner className="h-10 w-10 mx-auto" />
                                <p className="text-muted-foreground">Carregando informações...</p>
                              </div>
                            </div>
                          ) : !selectedCustomer ? (
                            <div className="text-center py-20">
                              <p className="text-muted-foreground">Nenhum dado encontrado</p>
                            </div>
                          ) : (
                            <div className="mt-8 space-y-6">
                              {selectedCustomer.score !== null && selectedCustomer.score !== undefined ? (
                                <>
                                  {/* Score de Crédito */}
                                  <Card className="border-2 bg-gradient-to-br from-primary/10 to-primary/5">
                                    <div className="p-6">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-sm text-muted-foreground mb-1">Score de Crédito</p>
                                          <p className="text-5xl font-bold text-primary">{selectedCustomer.score}</p>
                                          <p className="text-sm text-muted-foreground mt-2">
                                            {selectedCustomer.score >= 700
                                              ? "Excelente - Baixo risco"
                                              : selectedCustomer.score >= 500
                                                ? "Bom - Risco moderado"
                                                : selectedCustomer.score >= 300
                                                  ? "Regular - Requer atenção"
                                                  : "Atenção - Alto risco"}
                                          </p>
                                        </div>
                                        <TrendingUp className="h-16 w-16 text-primary/30" />
                                      </div>
                                    </div>
                                  </Card>

                                  {/* Informações Básicas */}
                                  <Card className="border-2">
                                    <div className="p-6">
                                      <div className="flex items-center gap-3 mb-4">
                                        <User className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-semibold">Informações Básicas</h3>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Nome</p>
                                          <p className="font-semibold">{selectedCustomer.name}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">CPF/CNPJ</p>
                                          <p className="font-mono font-semibold">{selectedCustomer.document}</p>
                                        </div>
                                        {selectedCustomer.city && (
                                          <div>
                                            <p className="text-xs text-muted-foreground mb-1">Cidade</p>
                                            <p>{selectedCustomer.city}</p>
                                          </div>
                                        )}
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Cadastrado em</p>
                                          <p>
                                            {selectedCustomer.created_at
                                              ? new Date(selectedCustomer.created_at).toLocaleDateString("pt-BR")
                                              : "N/A"}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </Card>

                                  {/* Situação Cadastral */}
                                  {selectedCustomer.analysis_data?.situacao_cpf && (
                                    <Card className="border-2">
                                      <div className="p-6">
                                        <h3 className="font-semibold mb-3">Situação Cadastral</h3>
                                        <Badge
                                          variant={
                                            selectedCustomer.analysis_data.situacao_cpf === "REGULAR"
                                              ? "default"
                                              : "destructive"
                                          }
                                          className="text-sm px-3 py-1"
                                        >
                                          {selectedCustomer.analysis_data.situacao_cpf}
                                        </Badge>
                                      </div>
                                    </Card>
                                  )}

                                  {selectedCustomer.analysis_data?.sancoes_ceis &&
                                    Array.isArray(selectedCustomer.analysis_data.sancoes_ceis) &&
                                    selectedCustomer.analysis_data.sancoes_ceis.length > 0 && (
                                      <Card className="border-2 border-red-200 bg-red-50/50 dark:bg-red-950/20">
                                        <div className="p-6">
                                          <div className="flex items-center gap-3 mb-4">
                                            <span className="text-2xl">⚠️</span>
                                            <div>
                                              <h3 className="font-semibold text-lg text-red-700 dark:text-red-400">
                                                Sanções CEIS
                                              </h3>
                                              <p className="text-sm text-muted-foreground">
                                                {selectedCustomer.analysis_data.sancoes_ceis.length} sanção(ões)
                                                encontrada(s)
                                              </p>
                                            </div>
                                          </div>
                                          <div className="space-y-3">
                                            {selectedCustomer.analysis_data.sancoes_ceis.map(
                                              (sancao: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  className="bg-white dark:bg-red-950/30 border border-red-200 rounded-lg p-4"
                                                >
                                                  <div className="space-y-2 text-sm">
                                                    {sancao.fonteSancao?.nomeExibicao && (
                                                      <div>
                                                        <p className="text-xs text-muted-foreground">
                                                          Órgão Sancionador
                                                        </p>
                                                        <p className="font-semibold">
                                                          {sancao.fonteSancao.nomeExibicao}
                                                        </p>
                                                      </div>
                                                    )}
                                                    {sancao.tipoSancao?.descricaoResumida && (
                                                      <div>
                                                        <p className="text-xs text-muted-foreground">Tipo de Sanção</p>
                                                        <Badge variant="destructive" className="mt-1">
                                                          {sancao.tipoSancao.descricaoResumida}
                                                        </Badge>
                                                      </div>
                                                    )}
                                                    {sancao.dataInicioSancao && (
                                                      <div>
                                                        <p className="text-xs text-muted-foreground">Data Início</p>
                                                        <p>{sancao.dataInicioSancao}</p>
                                                      </div>
                                                    )}
                                                    {sancao.dataFimSancao && (
                                                      <div>
                                                        <p className="text-xs text-muted-foreground">Data Fim</p>
                                                        <p>{sancao.dataFimSancao}</p>
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

                                  {selectedCustomer.analysis_data?.punicoes_cnep &&
                                    Array.isArray(selectedCustomer.analysis_data.punicoes_cnep) &&
                                    selectedCustomer.analysis_data.punicoes_cnep.length > 0 && (
                                      <Card className="border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                                        <div className="p-6">
                                          <div className="flex items-center gap-3 mb-4">
                                            <span className="text-2xl">⚠️</span>
                                            <div>
                                              <h3 className="font-semibold text-lg text-orange-700 dark:text-orange-400">
                                                Punições CNEP
                                              </h3>
                                              <p className="text-sm text-muted-foreground">
                                                {selectedCustomer.analysis_data.punicoes_cnep.length} punição(ões)
                                                encontrada(s)
                                              </p>
                                            </div>
                                          </div>
                                          <div className="space-y-3">
                                            {selectedCustomer.analysis_data.punicoes_cnep.map(
                                              (punicao: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  className="bg-white dark:bg-orange-950/30 border border-orange-200 rounded-lg p-4"
                                                >
                                                  <div className="space-y-2 text-sm">
                                                    {punicao.orgaoSancionador?.nome && (
                                                      <div>
                                                        <p className="text-xs text-muted-foreground">
                                                          Órgão Sancionador
                                                        </p>
                                                        <p className="font-semibold">{punicao.orgaoSancionador.nome}</p>
                                                      </div>
                                                    )}
                                                    {punicao.tipoSancao?.descricaoResumida && (
                                                      <div>
                                                        <p className="text-xs text-muted-foreground">Tipo de Sanção</p>
                                                        <Badge className="bg-orange-600 mt-1">
                                                          {punicao.tipoSancao.descricaoResumida}
                                                        </Badge>
                                                      </div>
                                                    )}
                                                    {punicao.valorMulta && (
                                                      <div>
                                                        <p className="text-xs text-muted-foreground">Valor da Multa</p>
                                                        <p className="text-xl font-bold text-orange-600">
                                                          R${" "}
                                                          {Number.parseFloat(punicao.valorMulta).toLocaleString(
                                                            "pt-BR",
                                                            { minimumFractionDigits: 2 },
                                                          )}
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

                                  {/* Vínculos Públicos */}
                                  {selectedCustomer.analysis_data?.vinculos_publicos &&
                                    Array.isArray(selectedCustomer.analysis_data.vinculos_publicos) &&
                                    selectedCustomer.analysis_data.vinculos_publicos.length > 0 && (
                                      <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                                        <div className="p-6">
                                          <div className="flex items-center gap-3 mb-4">
                                            <User className="h-5 w-5 text-blue-600" />
                                            <div>
                                              <h3 className="font-semibold text-lg text-blue-700 dark:text-blue-400">
                                                Vínculos Públicos
                                              </h3>
                                              <p className="text-sm text-muted-foreground">
                                                {selectedCustomer.analysis_data.vinculos_publicos.length} vínculo(s)
                                                encontrado(s)
                                              </p>
                                            </div>
                                          </div>
                                          <div className="grid gap-3 md:grid-cols-2">
                                            {selectedCustomer.analysis_data.vinculos_publicos.map(
                                              (vinculo: any, idx: number) => (
                                                <div
                                                  key={idx}
                                                  className="bg-white dark:bg-blue-950/30 border border-blue-200 rounded-lg p-4"
                                                >
                                                  {vinculo.orgao && (
                                                    <div className="mb-2">
                                                      <p className="text-xs text-muted-foreground">Órgão</p>
                                                      <p className="font-semibold">{vinculo.orgao}</p>
                                                    </div>
                                                  )}
                                                  {vinculo.cargo && (
                                                    <div>
                                                      <p className="text-xs text-muted-foreground">Cargo</p>
                                                      <Badge variant="secondary">{vinculo.cargo}</Badge>
                                                    </div>
                                                  )}
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      </Card>
                                    )}

                                  {/* Dados Completos */}
                                  <Card className="border-2">
                                    <div className="p-6">
                                      <h3 className="font-semibold mb-3">Dados Completos da API</h3>
                                      <details>
                                        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                          Ver JSON completo
                                        </summary>
                                        <pre className="mt-3 bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                                          {JSON.stringify(selectedCustomer.analysis_data, null, 2)}
                                        </pre>
                                      </details>
                                    </div>
                                  </Card>
                                </>
                              ) : (
                                <Card className="border-2 border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
                                  <div className="p-12 text-center">
                                    <span className="text-4xl mb-4 block">⚠️</span>
                                    <h3 className="text-xl font-semibold mb-2">Análise ainda não realizada</h3>
                                    <p className="text-muted-foreground">
                                      Execute a análise de crédito para ver o score e dados completos deste cliente.
                                    </p>
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

      {vmaxRecords.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum registro VMAX encontrado para esta empresa.</p>
        </div>
      )}
    </div>
  )
}
