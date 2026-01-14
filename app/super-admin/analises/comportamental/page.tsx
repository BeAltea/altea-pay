"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  Loader2,
  Sparkles,
  Building2,
  CheckCircle2,
  Eye,
  TrendingUp,
  FileText,
  DollarSign,
  AlertTriangle,
  Square,
  CheckSquare,
  CreditCard,
  Users,
  MapPin,
  Phone,
  Mail,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getAllCustomers, getAllCompanies } from "@/app/actions/analyses-actions"
import { runAsyncAssertivaAnalysis } from "@/app/actions/run-async-assertiva-analysis"
import { getPendingAnalyses } from "@/app/actions/get-pending-analyses"

export default function ComportamentalPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [pendingAnalyses, setPendingAnalyses] = useState<any[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCompany, setFilterCompany] = useState<string>("all")
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [isRunning, setIsRunning] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [sortBy, setSortBy] = useState<"name" | "score" | "status" | "date">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const { toast } = useToast()

  useEffect(() => {
    loadData()
    const interval = setInterval(loadPendingAnalyses, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [customersRes, companiesRes] = await Promise.all([getAllCustomers(), getAllCompanies()])

      if (customersRes.success) setCustomers(customersRes.data)
      if (companiesRes.success) setCompanies(companiesRes.data)

      await loadPendingAnalyses()
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadPendingAnalyses = async () => {
    try {
      const result = await getPendingAnalyses()
      if (result.success && result.data) {
        setPendingAnalyses(result.data)
      }
    } catch (error) {
      console.error("Error loading pending analyses:", error)
    }
  }

  const filteredCustomers = customers
    .filter((customer) => {
      const matchesSearch =
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.document?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCompany = filterCompany === "all" || customer.company_id === filterCompany
      return matchesSearch && matchesCompany
    })
    .map((customer) => {
      const analysis = pendingAnalyses.find((a) => a.cpf?.replace(/\D/g, "") === customer.document?.replace(/\D/g, ""))
      return {
        ...customer,
        hasAnalysis: !!analysis,
        analysisData: analysis,
      }
    })
    .sort((a, b) => {
      let compareValue = 0

      switch (sortBy) {
        case "name":
          compareValue = (a.name || "").localeCompare(b.name || "")
          break
        case "score":
          const scoreA = a.analysisData?.data?.credito?.resposta?.score?.pontos || 0
          const scoreB = b.analysisData?.data?.credito?.resposta?.score?.pontos || 0
          compareValue = scoreA - scoreB
          break
        case "status":
          compareValue = (a.hasAnalysis ? 1 : 0) - (b.hasAnalysis ? 1 : 0)
          break
        case "date":
          const dateA = a.analysisData?.created_at ? new Date(a.analysisData.created_at).getTime() : 0
          const dateB = b.analysisData?.created_at ? new Date(b.analysisData.created_at).getTime() : 0
          compareValue = dateA - dateB
          break
      }

      return sortOrder === "asc" ? compareValue : -compareValue
    })

  const toggleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map((c) => c.id)))
    }
  }

  const handleRunAnalysis = async () => {
    if (selectedCustomers.size === 0) {
      toast({
        title: "Nenhum cliente selecionado",
        description: "Selecione pelo menos um cliente",
        variant: "destructive",
      })
      return
    }

    setIsRunning(true)
    let successCount = 0

    try {
      for (const customerId of selectedCustomers) {
        const customer = customers.find((c) => c.id === customerId)
        if (!customer) continue

        const tipo = customer.document.replace(/\D/g, "").length === 11 ? "pf" : "pj"
        const result = await runAsyncAssertivaAnalysis({
          documento: customer.document,
          tipo,
          customerId: customer.id,
        })

        if (result.success) {
          successCount++
        } else {
          toast({
            title: `Erro: ${customer.name}`,
            description: result.error,
            variant: "destructive",
          })
        }
      }

      toast({
        title: "Análises comportamentais enviadas",
        description: `${successCount} análise(s) em processamento. Aguarde 2-5 minutos.`,
      })

      setSelectedCustomers(new Set())
      await loadPendingAnalyses()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handleViewDetails = (analysis: any) => {
    setSelectedAnalysis(analysis)
    setShowDetailsModal(true)
  }

  const renderDetailsModal = () => {
    if (!selectedAnalysis || !selectedAnalysis.data) return null

    const data = selectedAnalysis.data
    const creditoData = data.credito?.resposta || {}
    const recupereData = data.recupere?.resposta || {}
    const acoesData = data.acoes?.resposta || {}

    return (
      <Sheet open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <SheetContent className="w-full sm:max-w-6xl overflow-y-auto bg-background p-4 sm:p-6">
          <SheetHeader className="space-y-2">
            <SheetTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-600" />
              Análise Comportamental Completa
            </SheetTitle>
            <SheetDescription className="text-sm">
              {selectedAnalysis.cpf} • {new Date(selectedAnalysis.created_at).toLocaleString("pt-BR")}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            <Tabs defaultValue="scores" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="scores">Scores</TabsTrigger>
                <TabsTrigger value="acoes">Ações & Protestos</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="completo">JSON Completo</TabsTrigger>
              </TabsList>

              {/* ABA SCORES */}
              <TabsContent value="scores" className="mt-6 space-y-6">
                {/* Score de Crédito */}
                {creditoData.score && (
                  <Card className="border-2 border-blue-200 bg-blue-50/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-bold">Score de Crédito</h3>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-5xl font-bold text-blue-600">{creditoData.score.pontos}</div>
                          <Badge className="bg-blue-600 text-white mt-2">Classe {creditoData.score.classe}</Badge>
                        </div>
                        <div className="flex-1 ml-6">
                          <p className="text-sm text-gray-700">{creditoData.score.faixa?.descricao}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Score de Recuperação */}
                {recupereData.score && (
                  <Card className="border-2 border-yellow-200 bg-yellow-50/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="h-5 w-5 text-yellow-600" />
                        <h3 className="text-lg font-bold">Score de Recuperação</h3>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-5xl font-bold text-yellow-600">{recupereData.score.pontos}</div>
                          <Badge className="bg-yellow-600 text-white mt-2">Classe {recupereData.score.classe}</Badge>
                        </div>
                        <div className="flex-1 ml-6">
                          <p className="text-sm text-gray-700">{recupereData.score.faixa?.descricao}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Faturamento Estimado */}
                {(creditoData.faturamentoEstimado || creditoData.rendaPresumida) && (
                  <Card className="border-2 border-green-200 bg-green-50/50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-bold">
                          {creditoData.faturamentoEstimado ? "Faturamento Estimado" : "Renda Presumida"}
                        </h3>
                      </div>
                      <div className="text-4xl font-bold text-green-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(creditoData.faturamentoEstimado?.valor || creditoData.rendaPresumida?.valor || 0)}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ABA AÇÕES & PROTESTOS */}
              <TabsContent value="acoes" className="mt-6 space-y-6">
                <Card className="border-2 border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <h3 className="text-lg font-bold">Ações Judiciais</h3>
                    </div>
                    {acoesData.acoes && Object.keys(acoesData.acoes).length > 0 ? (
                      <div className="space-y-3">
                        {/* Exibir ações aqui se existirem */}
                        <p className="text-sm text-muted-foreground">Dados de ações disponíveis</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-green-700">Nenhuma ação judicial encontrada</p>
                        <p className="text-xs text-muted-foreground mt-1">Cliente sem registro de ações</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Protestos */}
                <Card className="border-2 border-red-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <h3 className="text-lg font-bold">Protestos</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Quantidade Total</p>
                        <p className="text-3xl font-bold text-red-600">
                          {creditoData.protestosPublicos?.qtdProtestos || 0}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
                        <p className="text-2xl font-bold text-red-600">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(Number.parseFloat(creditoData.protestosPublicos?.valorTotal) || 0)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <Badge
                          variant={(creditoData.protestosPublicos?.qtdProtestos || 0) > 0 ? "destructive" : "secondary"}
                        >
                          {(creditoData.protestosPublicos?.qtdProtestos || 0) > 0 ? "Com Protestos" : "Sem Protestos"}
                        </Badge>
                      </div>
                    </div>

                    {creditoData.protestosPublicos?.list && creditoData.protestosPublicos.list.length > 0 ? (
                      <div className="space-y-3 mt-4">
                        <h4 className="font-bold text-sm">Detalhes dos Protestos</h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {creditoData.protestosPublicos.list.map((protesto: any, idx: number) => (
                            <div key={idx} className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground">Cartório</p>
                                  <p className="font-bold">{protesto.cartorio}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Valor</p>
                                  <p className="font-bold text-red-600">
                                    {new Intl.NumberFormat("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    }).format(protesto.valor)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Data</p>
                                  <p className="font-medium">{protesto.data}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Cidade/UF</p>
                                  <p className="font-medium">
                                    {protesto.cidade} / {protesto.uf}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 mt-4">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-green-700">Nenhum protesto encontrado</p>
                        <p className="text-xs text-muted-foreground mt-1">Cliente sem registro de protestos</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="h-5 w-5 text-orange-600" />
                      <h3 className="text-lg font-bold">Cheques sem Fundos</h3>
                    </div>
                    {creditoData.cheques && Object.keys(creditoData.cheques).length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Quantidade</p>
                          <p className="text-3xl font-bold text-orange-600">{creditoData.cheques.quantidade || 0}</p>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(creditoData.cheques.valorTotal || 0)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-green-700">Nenhum cheque sem fundo encontrado</p>
                        <p className="text-xs text-muted-foreground mt-1">Cliente sem registro de cheques devolvidos</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ABA FINANCEIRO */}
              <TabsContent value="financeiro" className="mt-6 space-y-6">
                {/* Últimas Consultas */}
                <Card className="border-2 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-bold">
                        Últimas Consultas ({creditoData.ultimasConsultas?.qtdUltConsultas || 0})
                      </h3>
                    </div>
                    {creditoData.ultimasConsultas?.list && creditoData.ultimasConsultas.list.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {creditoData.ultimasConsultas.list.map((consulta: any, idx: number) => (
                          <div key={idx} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Data da Consulta</p>
                                <p className="text-lg font-bold text-blue-600">{consulta.dataOcorrencia}</p>
                              </div>
                              <Badge variant="secondary">#{idx + 1}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-600">Nenhuma consulta registrada</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <h3 className="text-lg font-bold">Débitos Financeiros</h3>
                    </div>
                    {creditoData.registrosDebitos?.list && creditoData.registrosDebitos.list.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {creditoData.registrosDebitos.list.map((debito: any, idx: number) => (
                          <div key={idx} className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Credor</p>
                                <p className="font-bold">{debito.credor || "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Valor</p>
                                <p className="font-bold text-orange-600">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(debito.valor || 0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Data</p>
                                <p className="font-medium">{debito.dataOcorrencia || "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Tipo</p>
                                <p className="font-medium">{debito.tipo || "N/A"}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-green-700">Nenhum débito financeiro encontrado</p>
                        <p className="text-xs text-muted-foreground mt-1">Cliente sem registro de débitos</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ABA CADASTRAL */}
              <TabsContent value="cadastral" className="mt-6 space-y-6">
                {creditoData.endereco && (
                  <Card className="border-2 border-purple-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-bold">Endereços</h3>
                      </div>
                      <div className="space-y-3">
                        {Array.isArray(creditoData.endereco) ? (
                          creditoData.endereco.map((end: any, idx: number) => (
                            <div key={idx} className="p-4 bg-purple-50 rounded-lg">
                              <p className="font-medium">
                                {end.logradouro}, {end.numero} - {end.bairro}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {end.cidade} - {end.uf} • CEP: {end.cep}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <p className="font-medium">
                              {creditoData.endereco.logradouro}, {creditoData.endereco.numero} -{" "}
                              {creditoData.endereco.bairro}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {creditoData.endereco.cidade} - {creditoData.endereco.uf} • CEP:{" "}
                              {creditoData.endereco.cep}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {creditoData.telefones && (
                  <Card className="border-2 border-green-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Phone className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-bold">Telefones</h3>
                      </div>
                      <div className="space-y-2">
                        {Array.isArray(creditoData.telefones) ? (
                          creditoData.telefones.map((tel: any, idx: number) => (
                            <div key={idx} className="p-3 bg-green-50 rounded-lg">
                              <p className="font-medium">
                                ({tel.ddd}) {tel.numero}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum telefone disponível</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {creditoData.emails && (
                  <Card className="border-2 border-blue-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-bold">E-mails</h3>
                      </div>
                      <div className="space-y-2">
                        {Array.isArray(creditoData.emails) ? (
                          creditoData.emails.map((email: any, idx: number) => (
                            <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                              <p className="font-medium">{email.email || email}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum e-mail disponível</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {creditoData.participacaoSocietaria && (
                  <Card className="border-2 border-yellow-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-yellow-600" />
                        <h3 className="text-lg font-bold">Participações Societárias</h3>
                      </div>
                      <div className="space-y-3">
                        {Array.isArray(creditoData.participacaoSocietaria) ? (
                          creditoData.participacaoSocietaria.map((empresa: any, idx: number) => (
                            <div key={idx} className="p-4 bg-yellow-50 rounded-lg">
                              <p className="font-bold">{empresa.nomeEmpresarial || empresa.razaoSocial}</p>
                              <p className="text-sm text-muted-foreground">CNPJ: {empresa.cnpj}</p>
                              <p className="text-sm text-muted-foreground">
                                Participação: {empresa.participacao || empresa.percentualParticipacao}%
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhuma participação disponível</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ABA JSON COMPLETO */}
              <TabsContent value="completo" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5" />
                      <h3 className="text-lg font-bold">Dados Completos da Análise (JSON)</h3>
                    </div>
                    <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-[600px] overflow-y-auto">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const handleSort = (field: "name" | "score" | "status" | "date") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Análise Comportamental</h1>
        <p className="text-muted-foreground mt-1">Inicie análises comportamentais assíncronas do sistema</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Buscar por nome ou CPF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Button variant="outline" size="default" onClick={toggleSelectAll} className="gap-2 border-2 bg-transparent">
            {selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0 ? (
              <>
                <CheckSquare className="h-4 w-4" />
                Desmarcar Todos
              </>
            ) : (
              <>
                <Square className="h-4 w-4" />
                Selecionar Todos ({filteredCustomers.length})
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

      <div className="flex gap-2">
        <Button
          variant={sortBy === "name" ? "default" : "outline"}
          onClick={() => handleSort("name")}
          className="gap-2"
        >
          Nome
          {sortBy === "name" && (sortOrder === "asc" ? " ↑" : " ↓")}
        </Button>
        <Button
          variant={sortBy === "score" ? "default" : "outline"}
          onClick={() => handleSort("score")}
          className="gap-2"
        >
          Score
          {sortBy === "score" && (sortOrder === "asc" ? " ↑" : " ↓")}
        </Button>
        <Button
          variant={sortBy === "status" ? "default" : "outline"}
          onClick={() => handleSort("status")}
          className="gap-2"
        >
          Status
          {sortBy === "status" && (sortOrder === "asc" ? " ↑" : " ↓")}
        </Button>
        <Button
          variant={sortBy === "date" ? "default" : "outline"}
          onClick={() => handleSort("date")}
          className="gap-2"
        >
          Data
          {sortBy === "date" && (sortOrder === "asc" ? " ↑" : " ↓")}
        </Button>
      </div>

      {selectedCustomers.size > 0 && (
        <Card className="border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-white shadow-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Análise Comportamental Assertiva</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomers.size} cliente{selectedCustomers.size > 1 ? "s" : ""} selecionado
                    {selectedCustomers.size > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleRunAnalysis}
                disabled={isRunning}
                className="gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
              >
                {isRunning ? (
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
              <p className="text-muted-foreground">Carregando clientes...</p>
            </CardContent>
          </Card>
        ) : filteredCustomers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Nenhum cliente encontrado</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou fazer uma nova busca</p>
            </CardContent>
          </Card>
        ) : (
          filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={selectedCustomers.has(customer.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedCustomers)
                        if (checked) {
                          newSet.add(customer.id)
                        } else {
                          newSet.delete(customer.id)
                        }
                        setSelectedCustomers(newSet)
                      }}
                      className="mt-1 h-6 w-6 border-2 border-gray-400"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">{customer.name}</h3>
                      <p className="text-sm text-muted-foreground">{customer.document}</p>
                      {customer.company_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />
                          {customer.company_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {customer.hasAnalysis && customer.analysisData?.data && (
                    <div className="flex items-center gap-3">
                      <div className="flex gap-3 text-right">
                        {(customer.analysisData.data.recupere?.resposta?.score ||
                          customer.analysisData.score_assertiva ||
                          customer.analysisData.score) && (
                          <div>
                            <p className="text-xs text-muted-foreground">Recuperação</p>
                            <div className="flex items-center gap-1">
                              <span className="text-xl font-bold text-yellow-600">
                                {customer.analysisData.data.recupere?.resposta?.score?.pontos ||
                                  customer.analysisData.score_assertiva ||
                                  customer.analysisData.score ||
                                  0}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {customer.analysisData.data.recupere?.resposta?.score?.classe || "N/A"}
                              </Badge>
                            </div>
                          </div>
                        )}
                        {(customer.analysisData.data.credito?.resposta?.score ||
                          customer.analysisData.score_assertiva ||
                          customer.analysisData.score) && (
                          <div>
                            <p className="text-xs text-muted-foreground">Crédito</p>
                            <div className="flex items-center gap-1">
                              <span className="text-xl font-bold text-blue-600">
                                {customer.analysisData.data.credito?.resposta?.score?.pontos ||
                                  customer.analysisData.score_assertiva ||
                                  customer.analysisData.score ||
                                  0}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {customer.analysisData.data.credito?.resposta?.score?.classe || "N/A"}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completo
                      </Badge>
                      <Button size="sm" onClick={() => handleViewDetails(customer.analysisData)} className="gap-2">
                        <Eye className="h-4 w-4" />
                        Ver Detalhes
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {renderDetailsModal()}
    </div>
  )
}
