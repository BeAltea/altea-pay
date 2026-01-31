"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import {
  Eye,
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Handshake,
  Trash2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  RefreshCw,
  FileText,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  Building2,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"
import { deleteCustomer } from "@/app/actions/delete-customer"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface Cliente {
  id: string
  Cliente: string
  "CPF/CNPJ": string
  Cidade: string
  UF: string
  credit_score: number
  approval_status: string
  sanctions_count: number
  Dias_Inad: number
  Vencido: string
  analysis_metadata: any
  behavioralData?: any // Adicionado para análise comportamental
  last_analysis_date?: string // Data da última análise restritiva
}

interface ClientesContentProps {
  clientes: Cliente[]
  company: { id: string; name: string } | null
}

type SortField = "name" | "score" | "status" | "days"
type SortDirection = "asc" | "desc"

export function ClientesContent({ clientes, company }: ClientesContentProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const router = useRouter()

  const comAnalise = clientes.filter((c) => c.analysis_metadata !== null).length

  const filteredAndSortedClientes = useMemo(() => {
    let filtered = clientes

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(
        (c) => c.Cliente?.toLowerCase().includes(searchTerm.toLowerCase()) || c["CPF/CNPJ"]?.includes(searchTerm),
      )
    }

    // Filtro de status
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.approval_status === statusFilter)
    }

    // Ordenação
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case "name":
          comparison = (a.Cliente || "").localeCompare(b.Cliente || "")
          break
        case "score":
          comparison = (a.credit_score || 0) - (b.credit_score || 0)
          break
        case "status":
          comparison = (a.approval_status || "").localeCompare(b.approval_status || "")
          break
        case "days":
          comparison = (a.Dias_Inad || 0) - (b.Dias_Inad || 0)
          break
      }

      return sortDirection === "asc" ? comparison : -comparison
    })

    return sorted
  }, [clientes, searchTerm, sortField, sortDirection, statusFilter])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!company?.id) {
      toast.error("Empresa não identificada")
      return
    }

    const confirmed = confirm(
      `Tem certeza que deseja excluir permanentemente o cliente ${customerName}?\n\nEsta ação não pode ser desfeita e removerá todos os dados associados.`,
    )
    if (!confirmed) return

    const result = await deleteCustomer(customerId, company.id)

    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-8 w-full overflow-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Empresa {company?.name} | {comAnalise} com análise
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Badge variant="secondary" className="text-base px-4 py-2 justify-center">
            {clientes.length} clientes
          </Badge>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/clientes/novo">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Cliente
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF/CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtros e Ordenação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="ACEITA">Aceita</SelectItem>
                <SelectItem value="ACEITA_ESPECIAL">Aceita Especial</SelectItem>
                <SelectItem value="REJEITA">Rejeita</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={sortField === "name" ? "default" : "outline"}
              onClick={() => toggleSort("name")}
              className="justify-between"
            >
              Nome
              <SortIcon field="name" />
            </Button>

            <Button
              variant={sortField === "score" ? "default" : "outline"}
              onClick={() => toggleSort("score")}
              className="justify-between"
            >
              Score
              <SortIcon field="score" />
            </Button>

            <Button
              variant={sortField === "status" ? "default" : "outline"}
              onClick={() => toggleSort("status")}
              className="justify-between"
            >
              Status
              <SortIcon field="status" />
            </Button>

            <Button
              variant={sortField === "days" ? "default" : "outline"}
              onClick={() => toggleSort("days")}
              className="justify-between"
            >
              Dias Atraso
              <SortIcon field="days" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 w-full">
        {filteredAndSortedClientes.map((cliente) => {
          const metadata = cliente.analysis_metadata
          const scoreRecupere = metadata?.recupere?.resposta?.score?.pontos || null
          const classeRecupere = metadata?.recupere?.resposta?.score?.classe || null

          const behavioralData = cliente.behavioralData?.data || cliente.behavioralData?.data_assertiva
          const rawBehavioralCreditScore = behavioralData?.credito?.resposta?.score?.pontos
          const behavioralCreditScore = rawBehavioralCreditScore === 0 ? 5 : rawBehavioralCreditScore
          const behavioralCreditClass = behavioralData?.credito?.resposta?.score?.classe
          const rawBehavioralRecoveryScore = behavioralData?.recupere?.resposta?.score?.pontos
          const behavioralRecoveryScore = rawBehavioralRecoveryScore === 0 ? 5 : rawBehavioralRecoveryScore
          const behavioralRecoveryClass = behavioralData?.recupere?.resposta?.score?.classe

          const hasBehavioralData = behavioralData && (rawBehavioralCreditScore !== undefined || rawBehavioralRecoveryScore !== undefined)

          // Define new Intl only if it's not already defined to avoid multiple declarations
          const newIntl =
            typeof Intl !== "undefined"
              ? Intl
              : { NumberFormat: () => ({ format: (value: number) => value.toString() }) }

          return (
            <Card key={cliente.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg flex items-start justify-between gap-2">
                  <span className="line-clamp-2 break-words min-w-0">{cliente.Cliente || "N/A"}</span>
                </CardTitle>
                <p className="text-xs md:text-sm text-muted-foreground break-words overflow-hidden">
                  {cliente["CPF/CNPJ"] || "N/A"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Análise Comportamental */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-3 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-600 inline-block" />
                      Análise Comportamental
                    </span>
                    {/* Data da última análise comportamental - usa updated_at se existir, senão created_at */}
                    {(cliente.behavioralData?.updated_at || cliente.behavioralData?.created_at) && (
                      <span className="text-[10px] text-amber-600">
                        {new Date(cliente.behavioralData.updated_at || cliente.behavioralData.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                  {hasBehavioralData ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Crédito</p>
                        <div className="flex items-baseline gap-1">
                          <p className="text-lg font-bold text-blue-600">{behavioralCreditScore || "-"}</p>
                          {behavioralCreditClass && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 px-1 bg-blue-100 text-blue-700 border-blue-300"
                            >
                              {behavioralCreditClass}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Recuperação</p>
                        <div className="flex items-baseline gap-1">
                          <p className="text-lg font-bold text-orange-600">{behavioralRecoveryScore || "-"}</p>
                          {behavioralRecoveryClass && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 px-1 bg-orange-100 text-orange-700 border-orange-300"
                            >
                              {behavioralRecoveryClass}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Não realizada</p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Ver Detalhes</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-6xl overflow-y-auto px-6 sm:px-8">
                      <SheetHeader className="pb-6">
                        <SheetTitle className="text-2xl">{cliente.Cliente}</SheetTitle>
                        <SheetDescription>{cliente["CPF/CNPJ"]} - Detalhes das análises de crédito</SheetDescription>
                      </SheetHeader>

                      <Tabs defaultValue="restritiva" className="mt-6">
                        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-slate-100 rounded-xl">
                          <TabsTrigger value="restritiva" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-700 font-semibold transition-all">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Analise Restritiva
                          </TabsTrigger>
                          <TabsTrigger value="comportamental" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-700 font-semibold transition-all">
                            <User className="h-4 w-4 mr-2" />
                            Analise Comportamental
                          </TabsTrigger>
                        </TabsList>

                        {/* ABA 1 - ANALISE RESTRITIVA */}
                        <TabsContent value="restritiva" className="space-y-5 mt-6 p-1">
                          {/* Header com Status Geral */}
                          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                <TrendingUp className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <h3 className="font-bold text-lg text-slate-800">Analise Restritiva</h3>
                                <p className="text-sm text-slate-500">Decisao rapida de abordagem</p>
                              </div>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`px-4 py-2 text-sm font-semibold ${
                                cliente.approval_status === "ACEITA" 
                                  ? "bg-green-100 text-green-700 border-green-300" 
                                  : cliente.approval_status === "ACEITA_ESPECIAL"
                                    ? "bg-amber-100 text-amber-700 border-amber-300"
                                    : "bg-red-100 text-red-700 border-red-300"
                              }`}
                            >
                              {cliente.approval_status || "Pendente"}
                            </Badge>
                          </div>

                          {/* Cards de Score com Barra de Progresso */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Score Credito */}
                            <Card className="overflow-hidden border-0 shadow-lg">
                              <div className="h-2 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600" />
                              <CardContent className="p-5">
                                {(() => {
                                  const creditoScore = metadata?.credito?.resposta?.score?.pontos
                                  const displayScore = creditoScore === 0 ? 5 : creditoScore || cliente.credit_score || 0
                                  const scoreClass = metadata?.credito?.resposta?.score?.classe || "-"
                                  const scoreFaixa = metadata?.credito?.resposta?.score?.faixa?.titulo || "-"
                                  const scorePercent = typeof displayScore === 'number' ? Math.min((displayScore / 1000) * 100, 100) : 0
                                  return (
                                    <>
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <TrendingUp className="h-5 w-5 text-blue-600" />
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Score Credito</p>
                                            <p className="text-xs text-blue-600 font-semibold">{scoreFaixa}</p>
                                          </div>
                                        </div>
                                        <Badge className="bg-blue-600 hover:bg-blue-600 text-white px-3 py-1 text-sm font-bold">
                                          {scoreClass}
                                        </Badge>
                                      </div>
                                      <div className="flex items-end gap-2 mb-3">
                                        <span className="text-5xl font-black text-slate-800">{displayScore}</span>
                                        <span className="text-slate-400 text-lg mb-2">/ 1000</span>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-blue-400 to-indigo-600 rounded-full transition-all duration-500"
                                          style={{ width: `${scorePercent}%` }}
                                        />
                                      </div>
                                    </>
                                  )
                                })()}
                              </CardContent>
                            </Card>

                            {/* Score Recupere */}
                            <Card className="overflow-hidden border-0 shadow-lg">
                              <div className="h-2 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-600" />
                              <CardContent className="p-5">
                                {(() => {
                                  const recupereScore = metadata?.recupere?.resposta?.score?.pontos
                                  const displayScore = recupereScore === 0 ? 5 : recupereScore || 0
                                  const scoreClass = metadata?.recupere?.resposta?.score?.classe || "-"
                                  const scoreFaixa = metadata?.recupere?.resposta?.score?.faixa?.titulo || "-"
                                  const scoreFaixaDesc = metadata?.recupere?.resposta?.score?.faixa?.descricao || ""
                                  const scorePercent = typeof displayScore === 'number' ? Math.min((displayScore / 1000) * 100, 100) : 0
                                  return (
                                    <>
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                            <RefreshCw className="h-5 w-5 text-orange-600" />
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Score Recupere</p>
                                            <p className="text-xs text-orange-600 font-semibold">{scoreFaixa}</p>
                                          </div>
                                        </div>
                                        <Badge className="bg-orange-500 hover:bg-orange-500 text-white px-3 py-1 text-sm font-bold">
                                          {scoreClass}
                                        </Badge>
                                      </div>
                                      <div className="flex items-end gap-2 mb-3">
                                        <span className="text-5xl font-black text-slate-800">{displayScore}</span>
                                        <span className="text-slate-400 text-lg mb-2">/ 1000</span>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-500"
                                          style={{ width: `${scorePercent}%` }}
                                        />
                                      </div>
                                      {scoreFaixaDesc && (
                                        <p className="text-xs text-slate-500 mt-3 leading-relaxed">{scoreFaixaDesc}</p>
                                      )}
                                    </>
                                  )
                                })()}
                              </CardContent>
                            </Card>
                          </div>

                          {/* Alertas Rapidos - Redesenhados */}
                          <Card className="border-0 shadow-md overflow-hidden">
                            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-slate-100">
                              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-slate-500" />
                                Indicadores Rapidos
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className={`p-4 rounded-xl text-center transition-all ${
                                  (metadata?.credito?.resposta?.protestosPublicos?.qtdProtestos || metadata?.acoes?.resposta?.protestos?.qtdProtestos || 0) > 0 
                                    ? "bg-red-50 border-2 border-red-200" 
                                    : "bg-green-50 border-2 border-green-200"
                                }`}>
                                  <div className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center mb-2 ${
                                    (metadata?.credito?.resposta?.protestosPublicos?.qtdProtestos || metadata?.acoes?.resposta?.protestos?.qtdProtestos || 0) > 0 
                                      ? "bg-red-100" 
                                      : "bg-green-100"
                                  }`}>
                                    <AlertCircle className={`h-5 w-5 ${
                                      (metadata?.credito?.resposta?.protestosPublicos?.qtdProtestos || metadata?.acoes?.resposta?.protestos?.qtdProtestos || 0) > 0 
                                        ? "text-red-600" 
                                        : "text-green-600"
                                    }`} />
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium mb-1">Protestos</p>
                                  <p className={`text-2xl font-black ${
                                    (metadata?.credito?.resposta?.protestosPublicos?.qtdProtestos || metadata?.acoes?.resposta?.protestos?.qtdProtestos || 0) > 0 
                                      ? "text-red-600" 
                                      : "text-green-600"
                                  }`}>
                                    {metadata?.credito?.resposta?.protestosPublicos?.qtdProtestos || 
                                     metadata?.acoes?.resposta?.protestos?.qtdProtestos || 0}
                                  </p>
                                </div>
                                
                                <div className="p-4 rounded-xl text-center bg-blue-50 border-2 border-blue-200">
                                  <div className="mx-auto h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                                    <Eye className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium mb-1">Consultas</p>
                                  <p className="text-2xl font-black text-blue-600">
                                    {metadata?.credito?.resposta?.ultimasConsultas?.qtdUltConsultas || 0}
                                  </p>
                                </div>
                                
                                <div className={`p-4 rounded-xl text-center transition-all ${
                                  (metadata?.credito?.resposta?.registrosDebitos?.qtdDebitos || 0) > 0 
                                    ? "bg-purple-50 border-2 border-purple-200" 
                                    : "bg-green-50 border-2 border-green-200"
                                }`}>
                                  <div className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center mb-2 ${
                                    (metadata?.credito?.resposta?.registrosDebitos?.qtdDebitos || 0) > 0 
                                      ? "bg-purple-100" 
                                      : "bg-green-100"
                                  }`}>
                                    <DollarSign className={`h-5 w-5 ${
                                      (metadata?.credito?.resposta?.registrosDebitos?.qtdDebitos || 0) > 0 
                                        ? "text-purple-600" 
                                        : "text-green-600"
                                    }`} />
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium mb-1">Debitos</p>
                                  <p className={`text-2xl font-black ${
                                    (metadata?.credito?.resposta?.registrosDebitos?.qtdDebitos || 0) > 0 
                                      ? "text-purple-600" 
                                      : "text-green-600"
                                  }`}>
                                    {metadata?.credito?.resposta?.registrosDebitos?.qtdDebitos || 0}
                                  </p>
                                </div>
                                
                                <div className={`p-4 rounded-xl text-center transition-all ${
                                  (metadata?.credito?.resposta?.cheques?.quantidade || 0) > 0 
                                    ? "bg-orange-50 border-2 border-orange-200" 
                                    : "bg-green-50 border-2 border-green-200"
                                }`}>
                                  <div className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center mb-2 ${
                                    (metadata?.credito?.resposta?.cheques?.quantidade || 0) > 0 
                                      ? "bg-orange-100" 
                                      : "bg-green-100"
                                  }`}>
                                    <FileText className={`h-5 w-5 ${
                                      (metadata?.credito?.resposta?.cheques?.quantidade || 0) > 0 
                                        ? "text-orange-600" 
                                        : "text-green-600"
                                    }`} />
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium mb-1">Cheques s/ Fundo</p>
                                  <p className={`text-2xl font-black ${
                                    (metadata?.credito?.resposta?.cheques?.quantidade || 0) > 0 
                                      ? "text-orange-600" 
                                      : "text-green-600"
                                  }`}>
                                    {metadata?.credito?.resposta?.cheques?.quantidade || 0}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Protestos Publicos */}
                          {metadata?.credito?.resposta?.protestosPublicos?.list && 
                           metadata.credito.resposta.protestosPublicos.list.length > 0 && (
                            <Card className="border-0 shadow-md overflow-hidden">
                              <div className="h-1 bg-gradient-to-r from-red-400 to-red-600" />
                              <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-rose-50">
                                <CardTitle className="text-sm font-semibold text-red-700 flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                                      <AlertCircle className="h-4 w-4 text-red-600" />
                                    </div>
                                    Protestos Publicos
                                  </span>
                                  <Badge className="bg-red-600 text-white">{metadata.credito.resposta.protestosPublicos.qtdProtestos || 0}</Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                                    <p className="text-xs text-red-500 font-medium mb-1">Quantidade</p>
                                    <p className="text-2xl font-black text-red-600">
                                      {metadata.credito.resposta.protestosPublicos.qtdProtestos || 0}
                                    </p>
                                  </div>
                                  <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                                    <p className="text-xs text-red-500 font-medium mb-1">Valor Total</p>
                                    <p className="text-lg font-black text-red-600">
                                      {metadata.credito.resposta.protestosPublicos.valorTotal || "R$ 0,00"}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {metadata.credito.resposta.protestosPublicos.list.map((protesto: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-white rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-2">
                                          <div className="h-6 w-6 rounded bg-red-100 flex items-center justify-center mt-0.5">
                                            <FileText className="h-3 w-3 text-red-600" />
                                          </div>
                                          <div>
                                            <p className="font-semibold text-sm text-slate-800">{protesto.cartorio || "Cartorio N/A"}</p>
                                            <p className="text-xs text-slate-500">
                                              {protesto.cidade || "N/A"} - {protesto.uf || "N/A"} | {protesto.dataOcorrencia || "N/A"}
                                            </p>
                                          </div>
                                        </div>
                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 font-bold">
                                          {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(protesto.valor || 0)}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Protestos via Acoes (fallback) */}
                          {(!metadata?.credito?.resposta?.protestosPublicos?.list || metadata.credito.resposta.protestosPublicos.list.length === 0) &&
                           metadata?.acoes?.resposta?.protestos?.list && 
                           metadata.acoes.resposta.protestos.list.length > 0 && (
                            <Card className="border-0 shadow-md overflow-hidden">
                              <div className="h-1 bg-gradient-to-r from-red-400 to-red-600" />
                              <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-rose-50">
                                <CardTitle className="text-sm font-semibold text-red-700 flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                                      <AlertCircle className="h-4 w-4 text-red-600" />
                                    </div>
                                    Protestos
                                  </span>
                                  <Badge className="bg-red-600 text-white">{metadata.acoes.resposta.protestos.qtdProtestos || 0}</Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                                    <p className="text-xs text-red-500 font-medium mb-1">Quantidade</p>
                                    <p className="text-2xl font-black text-red-600">
                                      {metadata.acoes.resposta.protestos.qtdProtestos || 0}
                                    </p>
                                  </div>
                                  <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-center">
                                    <p className="text-xs text-red-500 font-medium mb-1">Valor Total</p>
                                    <p className="text-lg font-black text-red-600">
                                      {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(metadata.acoes.resposta.protestos.valorTotal || 0)}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {metadata.acoes.resposta.protestos.list.map((protesto: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-white rounded-lg border border-red-100 shadow-sm">
                                      <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-2">
                                          <div className="h-6 w-6 rounded bg-red-100 flex items-center justify-center mt-0.5">
                                            <FileText className="h-3 w-3 text-red-600" />
                                          </div>
                                          <div>
                                            <p className="font-semibold text-sm text-slate-800">{protesto.cartorio || "Cartorio N/A"}</p>
                                            <p className="text-xs text-slate-500">{protesto.cidade || "N/A"} - {protesto.uf || "N/A"}</p>
                                          </div>
                                        </div>
                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 font-bold">
                                          {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(protesto.valor || 0)}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Debitos Financeiros */}
                          {metadata?.credito?.resposta?.registrosDebitos?.list &&
                           metadata.credito.resposta.registrosDebitos.list.length > 0 && (
                            <Card className="border-0 shadow-md overflow-hidden">
                              <div className="h-1 bg-gradient-to-r from-purple-400 to-indigo-600" />
                              <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-indigo-50">
                                <CardTitle className="text-sm font-semibold text-purple-700 flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                      <DollarSign className="h-4 w-4 text-purple-600" />
                                    </div>
                                    Debitos Financeiros
                                  </span>
                                  <Badge className="bg-purple-600 text-white">{metadata.credito.resposta.registrosDebitos.qtdDebitos || 0}</Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                                    <p className="text-xs text-purple-500 font-medium mb-1">Quantidade</p>
                                    <p className="text-2xl font-black text-purple-600">
                                      {metadata.credito.resposta.registrosDebitos.qtdDebitos || 0}
                                    </p>
                                  </div>
                                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                                    <p className="text-xs text-purple-500 font-medium mb-1">Valor Total</p>
                                    <p className="text-lg font-black text-purple-600">
                                      {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(metadata.credito.resposta.registrosDebitos.valorTotal || 0)}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {metadata.credito.resposta.registrosDebitos.list.map((debito: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-white rounded-lg border border-purple-100 shadow-sm">
                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex items-center gap-2">
                                          <Building2 className="h-4 w-4 text-purple-400" />
                                          <div>
                                            <p className="text-xs text-slate-400">Credor</p>
                                            <p className="font-semibold text-slate-800">{debito.credor || "N/A"}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <DollarSign className="h-4 w-4 text-purple-400" />
                                          <div>
                                            <p className="text-xs text-slate-400">Valor</p>
                                            <p className="font-bold text-purple-600">
                                              {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(debito.valor || 0)}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-purple-400" />
                                          <div>
                                            <p className="text-xs text-slate-400">Vencimento</p>
                                            <p className="font-medium text-slate-700">{debito.dataVencimento || "N/A"}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-purple-400" />
                                          <div>
                                            <p className="text-xs text-slate-400">Local</p>
                                            <p className="font-medium text-slate-700">{debito.cidade || "N/A"}/{debito.uf || "N/A"}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Cheques sem Fundo */}
                          <Card className="border-0 shadow-md overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-500" />
                            <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-amber-50">
                              <CardTitle className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-orange-600" />
                                </div>
                                Cheques sem Fundo
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                              {(metadata?.credito?.resposta?.cheques?.quantidade || 0) > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-center">
                                    <p className="text-xs text-orange-500 font-medium mb-1">Quantidade</p>
                                    <p className="text-3xl font-black text-orange-600">
                                      {metadata?.credito?.resposta?.cheques?.quantidade || 0}
                                    </p>
                                  </div>
                                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-center">
                                    <p className="text-xs text-orange-500 font-medium mb-1">Valor Total</p>
                                    <p className="text-xl font-black text-orange-600">
                                      {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(metadata?.credito?.resposta?.cheques?.valorTotal || 0)}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                                  <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                                  <p className="text-sm font-semibold text-green-700">Nenhum cheque sem fundo</p>
                                  <p className="text-xs text-green-500">Situacao regular</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Ultimas Consultas */}
                          {metadata?.credito?.resposta?.ultimasConsultas?.list &&
                           metadata.credito.resposta.ultimasConsultas.list.length > 0 && (
                            <Card className="border-0 shadow-md overflow-hidden">
                              <div className="h-1 bg-gradient-to-r from-blue-400 to-cyan-500" />
                              <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-cyan-50">
                                <CardTitle className="text-sm font-semibold text-blue-700 flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                      <Eye className="h-4 w-4 text-blue-600" />
                                    </div>
                                    Ultimas Consultas
                                  </span>
                                  <Badge className="bg-blue-600 text-white">{metadata.credito.resposta.ultimasConsultas.qtdUltConsultas || 0}</Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4">
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {metadata.credito.resposta.ultimasConsultas.list.slice(0, 10).map((consulta: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100 shadow-sm">
                                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Clock className="h-4 w-4 text-blue-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-slate-800">{consulta.dataOcorrencia}</p>
                                        <p className="text-xs text-slate-500">Consulta realizada</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          {/* Sancoes e Punicoes */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="border-0 shadow-md overflow-hidden">
                              <div className={`h-1 ${(metadata?.credito?.resposta?.ceis?.qtdOcorrencias || metadata?.sancoes_ceis || 0) > 0 ? "bg-gradient-to-r from-red-400 to-rose-500" : "bg-gradient-to-r from-green-400 to-emerald-500"}`} />
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${(metadata?.credito?.resposta?.ceis?.qtdOcorrencias || metadata?.sancoes_ceis || 0) > 0 ? "bg-red-100" : "bg-green-100"}`}>
                                      <Shield className={`h-6 w-6 ${(metadata?.credito?.resposta?.ceis?.qtdOcorrencias || metadata?.sancoes_ceis || 0) > 0 ? "text-red-600" : "text-green-600"}`} />
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Sancoes CEIS</p>
                                      <p className={`text-2xl font-black ${(metadata?.credito?.resposta?.ceis?.qtdOcorrencias || metadata?.sancoes_ceis || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                                        {metadata?.credito?.resposta?.ceis?.qtdOcorrencias || metadata?.sancoes_ceis || 0}
                                      </p>
                                    </div>
                                  </div>
                                  {(metadata?.credito?.resposta?.ceis?.qtdOcorrencias || metadata?.sancoes_ceis || 0) > 0 
                                    ? <XCircle className="h-8 w-8 text-red-400" />
                                    : <CheckCircle2 className="h-8 w-8 text-green-400" />
                                  }
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="border-0 shadow-md overflow-hidden">
                              <div className={`h-1 ${(metadata?.credito?.resposta?.cnep?.qtdOcorrencias || metadata?.punicoes_cnep || 0) > 0 ? "bg-gradient-to-r from-orange-400 to-amber-500" : "bg-gradient-to-r from-green-400 to-emerald-500"}`} />
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${(metadata?.credito?.resposta?.cnep?.qtdOcorrencias || metadata?.punicoes_cnep || 0) > 0 ? "bg-orange-100" : "bg-green-100"}`}>
                                      <Shield className={`h-6 w-6 ${(metadata?.credito?.resposta?.cnep?.qtdOcorrencias || metadata?.punicoes_cnep || 0) > 0 ? "text-orange-600" : "text-green-600"}`} />
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Punicoes CNEP</p>
                                      <p className={`text-2xl font-black ${(metadata?.credito?.resposta?.cnep?.qtdOcorrencias || metadata?.punicoes_cnep || 0) > 0 ? "text-orange-600" : "text-green-600"}`}>
                                        {metadata?.credito?.resposta?.cnep?.qtdOcorrencias || metadata?.punicoes_cnep || 0}
                                      </p>
                                    </div>
                                  </div>
                                  {(metadata?.credito?.resposta?.cnep?.qtdOcorrencias || metadata?.punicoes_cnep || 0) > 0 
                                    ? <XCircle className="h-8 w-8 text-orange-400" />
                                    : <CheckCircle2 className="h-8 w-8 text-green-400" />
                                  }
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Info do Cliente */}
                          <Card className="border-0 shadow-md overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-slate-400 to-slate-600" />
                            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-gray-50">
                              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                  <User className="h-4 w-4 text-slate-600" />
                                </div>
                                Informacoes do Cliente
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                  <MapPin className="h-5 w-5 text-slate-400" />
                                  <div>
                                    <p className="text-xs text-slate-400">Localizacao</p>
                                    <p className="font-semibold text-slate-700">{cliente.Cidade || "N/A"}, {cliente.UF || "-"}</p>
                                  </div>
                                </div>
                                {cliente.Dias_Inad > 0 && (
                                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                                    <Clock className="h-5 w-5 text-red-400" />
                                    <div>
                                      <p className="text-xs text-red-400">Inadimplencia</p>
                                      <p className="font-bold text-red-600">{cliente.Dias_Inad} dias</p>
                                    </div>
                                  </div>
                                )}
                                {cliente.Vencido && Number.parseFloat(cliente.Vencido.toString().replace(",", ".")) > 0 && (
                                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                                    <DollarSign className="h-5 w-5 text-red-400" />
                                    <div>
                                      <p className="text-xs text-red-400">Valor Vencido</p>
                                      <p className="font-bold text-red-600">
                                        R$ {Number.parseFloat(cliente.Vencido.toString().replace(",", ".")).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                  <Shield className="h-5 w-5 text-slate-400" />
                                  <div>
                                    <p className="text-xs text-slate-400">Status</p>
                                    <Badge 
                                      className={`mt-1 ${
                                        cliente.approval_status === "ACEITA" 
                                          ? "bg-green-100 text-green-700 hover:bg-green-100" 
                                          : cliente.approval_status === "ACEITA_ESPECIAL"
                                            ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                            : "bg-red-100 text-red-700 hover:bg-red-100"
                                      }`}
                                    >
                                      {cliente.approval_status || "Pendente"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Sem dados */}
                          {!metadata && (
                            <Card className="border-0 shadow-md">
                              <CardContent className="py-16 text-center">
                                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                  <TrendingUp className="h-8 w-8 text-slate-400" />
                                </div>
                                <p className="text-lg font-semibold text-slate-600 mb-2">Analise Restritiva nao realizada</p>
                                <p className="text-sm text-slate-400">Os dados restritivos ainda nao foram processados para este cliente</p>
                              </CardContent>
                            </Card>
                          )}
                        </TabsContent>

                        {/* ABA 2 - ANALISE COMPORTAMENTAL */}
                        <TabsContent value="comportamental" className="space-y-5 mt-6 p-1">
                          {hasBehavioralData ? (
                            <>
                              {/* Header com Status Geral */}
                              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <User className="h-6 w-6 text-white" />
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-lg text-slate-800">Analise Comportamental</h3>
                                    <p className="text-sm text-slate-500">Perfil detalhado do cliente</p>
                                  </div>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`px-4 py-2 text-sm font-semibold ${
                                    behavioralCreditScore >= 700 
                                      ? "bg-green-100 text-green-700 border-green-300" 
                                      : behavioralCreditScore >= 400
                                        ? "bg-amber-100 text-amber-700 border-amber-300"
                                        : "bg-red-100 text-red-700 border-red-300"
                                  }`}
                                >
                                  {behavioralCreditScore >= 700 ? "Baixo Risco" : behavioralCreditScore >= 400 ? "Risco Moderado" : "Alto Risco"}
                                </Badge>
                              </div>

                              {/* Cards de Score com Barra de Progresso */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Score Credito */}
                                <Card className="overflow-hidden border-0 shadow-lg">
                                  <div className="h-2 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600" />
                                  <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                          <TrendingUp className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Score Credito</p>
                                          {behavioralData?.credito?.resposta?.score?.faixa?.titulo && (
                                            <p className="text-xs text-blue-600 font-semibold">
                                              {behavioralData.credito.resposta.score.faixa.titulo}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      {behavioralCreditClass && (
                                        <Badge className="bg-blue-600 hover:bg-blue-600 text-white px-3 py-1 text-sm font-bold">
                                          {behavioralCreditClass}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-end gap-2 mb-3">
                                      <span className="text-5xl font-black text-slate-800">{behavioralCreditScore || 0}</span>
                                      <span className="text-slate-400 text-lg mb-2">/ 1000</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-600 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min((behavioralCreditScore || 0) / 10, 100)}%` }}
                                      />
                                    </div>
                                    {behavioralData?.credito?.resposta?.score?.probabilidade && (
                                      <p className="text-xs text-slate-500 mt-2">
                                        Probabilidade de pagamento: <span className="font-semibold text-blue-600">{behavioralData.credito.resposta.score.probabilidade}%</span>
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>

                                {/* Score Recupere */}
                                <Card className="overflow-hidden border-0 shadow-lg">
                                  <div className="h-2 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-600" />
                                  <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                          <RefreshCw className="h-5 w-5 text-orange-600" />
                                        </div>
                                        <div>
                                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Score Recupere</p>
                                          {behavioralData?.recupere?.resposta?.score?.faixa?.titulo && (
                                            <p className="text-xs text-orange-600 font-semibold">
                                              {behavioralData.recupere.resposta.score.faixa.titulo}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      {behavioralRecoveryClass && (
                                        <Badge className="bg-orange-500 hover:bg-orange-500 text-white px-3 py-1 text-sm font-bold">
                                          {behavioralRecoveryClass}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-end gap-2 mb-3">
                                      <span className="text-5xl font-black text-slate-800">{behavioralRecoveryScore || 0}</span>
                                      <span className="text-slate-400 text-lg mb-2">/ 1000</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min((behavioralRecoveryScore || 0) / 10, 100)}%` }}
                                      />
                                    </div>
                                    {behavioralData?.recupere?.resposta?.score?.probabilidade && (
                                      <p className="text-xs text-slate-500 mt-2">
                                        Probabilidade de recuperacao: <span className="font-semibold text-orange-600">{behavioralData.recupere.resposta.score.probabilidade}%</span>
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>

                              {/* Projecao de Recuperacao */}
                              {behavioralData?.recupere?.resposta?.projecaoRecuperacao && (
                                <Card className="border-0 shadow-md overflow-hidden">
                                  <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
                                  <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50">
                                    <CardTitle className="text-sm font-semibold text-green-700 flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                      </div>
                                      Projecao de Recuperacao
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-4">
                                    <div className="grid grid-cols-3 gap-3">
                                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 text-center">
                                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                                          <span className="text-lg font-bold text-green-600">30</span>
                                        </div>
                                        <p className="text-xs text-green-500 font-medium mb-1">dias</p>
                                        <p className="text-3xl font-black text-green-600">
                                          {behavioralData.recupere.resposta.projecaoRecuperacao.probabilidade30dias || 0}%
                                        </p>
                                      </div>
                                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 text-center">
                                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                                          <span className="text-lg font-bold text-green-600">60</span>
                                        </div>
                                        <p className="text-xs text-green-500 font-medium mb-1">dias</p>
                                        <p className="text-3xl font-black text-green-600">
                                          {behavioralData.recupere.resposta.projecaoRecuperacao.probabilidade60dias || 0}%
                                        </p>
                                      </div>
                                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 text-center">
                                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                                          <span className="text-lg font-bold text-green-600">90</span>
                                        </div>
                                        <p className="text-xs text-green-500 font-medium mb-1">dias</p>
                                        <p className="text-3xl font-black text-green-600">
                                          {behavioralData.recupere.resposta.projecaoRecuperacao.probabilidade90dias || 0}%
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Risco / Restricoes (alertas) */}
                              <Card className="border-0 shadow-md overflow-hidden">
                                <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-gray-50">
                                  <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-slate-500" />
                                    Risco / Restricoes
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className={`p-4 rounded-xl text-center transition-all ${
                                      (behavioralData?.credito?.resposta?.pendenciasFinanceiras?.quantidade || behavioralData?.credito?.resposta?.registrosDebitos?.qtdDebitos || 0) > 0 
                                        ? "bg-red-50 border-2 border-red-200" 
                                        : "bg-green-50 border-2 border-green-200"
                                    }`}>
                                      <div className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center mb-2 ${
                                        (behavioralData?.credito?.resposta?.pendenciasFinanceiras?.quantidade || behavioralData?.credito?.resposta?.registrosDebitos?.qtdDebitos || 0) > 0 
                                          ? "bg-red-100" : "bg-green-100"
                                      }`}>
                                        <DollarSign className={`h-5 w-5 ${
                                          (behavioralData?.credito?.resposta?.pendenciasFinanceiras?.quantidade || behavioralData?.credito?.resposta?.registrosDebitos?.qtdDebitos || 0) > 0 
                                            ? "text-red-600" : "text-green-600"
                                        }`} />
                                      </div>
                                      <p className="text-xs text-slate-500 font-medium mb-1">Pendencias</p>
                                      <p className={`text-2xl font-black ${
                                        (behavioralData?.credito?.resposta?.pendenciasFinanceiras?.quantidade || behavioralData?.credito?.resposta?.registrosDebitos?.qtdDebitos || 0) > 0 
                                          ? "text-red-600" : "text-green-600"
                                      }`}>
                                        {behavioralData?.credito?.resposta?.pendenciasFinanceiras?.quantidade || 
                                         behavioralData?.credito?.resposta?.registrosDebitos?.qtdDebitos || 0}
                                      </p>
                                      <p className="text-xs text-slate-400 mt-1">
                                        {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                          behavioralData?.credito?.resposta?.pendenciasFinanceiras?.valorTotal || 
                                          behavioralData?.credito?.resposta?.registrosDebitos?.valorTotal || 0
                                        )}
                                      </p>
                                    </div>
                                    
                                    <div className={`p-4 rounded-xl text-center transition-all ${
                                      (behavioralData?.acoes?.resposta?.protestos?.qtdProtestos || behavioralData?.credito?.resposta?.protestosPublicos?.qtdProtestos || 0) > 0 
                                        ? "bg-red-50 border-2 border-red-200" 
                                        : "bg-green-50 border-2 border-green-200"
                                    }`}>
                                      <div className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center mb-2 ${
                                        (behavioralData?.acoes?.resposta?.protestos?.qtdProtestos || behavioralData?.credito?.resposta?.protestosPublicos?.qtdProtestos || 0) > 0 
                                          ? "bg-red-100" : "bg-green-100"
                                      }`}>
                                        <AlertCircle className={`h-5 w-5 ${
                                          (behavioralData?.acoes?.resposta?.protestos?.qtdProtestos || behavioralData?.credito?.resposta?.protestosPublicos?.qtdProtestos || 0) > 0 
                                            ? "text-red-600" : "text-green-600"
                                        }`} />
                                      </div>
                                      <p className="text-xs text-slate-500 font-medium mb-1">Protestos</p>
                                      <p className={`text-2xl font-black ${
                                        (behavioralData?.acoes?.resposta?.protestos?.qtdProtestos || behavioralData?.credito?.resposta?.protestosPublicos?.qtdProtestos || 0) > 0 
                                          ? "text-red-600" : "text-green-600"
                                      }`}>
                                        {behavioralData?.acoes?.resposta?.protestos?.qtdProtestos || 
                                         behavioralData?.credito?.resposta?.protestosPublicos?.qtdProtestos || 0}
                                      </p>
                                      <p className="text-xs text-slate-400 mt-1">
                                        {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                          behavioralData?.acoes?.resposta?.protestos?.valorTotal || 
                                          behavioralData?.credito?.resposta?.protestosPublicos?.valorTotal || 0
                                        )}
                                      </p>
                                    </div>
                                    
                                    <div className={`p-4 rounded-xl text-center transition-all ${
                                      (behavioralData?.credito?.resposta?.chequesSemFundo?.quantidade || behavioralData?.credito?.resposta?.cheques?.quantidade || 0) > 0 
                                        ? "bg-orange-50 border-2 border-orange-200" 
                                        : "bg-green-50 border-2 border-green-200"
                                    }`}>
                                      <div className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center mb-2 ${
                                        (behavioralData?.credito?.resposta?.chequesSemFundo?.quantidade || behavioralData?.credito?.resposta?.cheques?.quantidade || 0) > 0 
                                          ? "bg-orange-100" : "bg-green-100"
                                      }`}>
                                        <FileText className={`h-5 w-5 ${
                                          (behavioralData?.credito?.resposta?.chequesSemFundo?.quantidade || behavioralData?.credito?.resposta?.cheques?.quantidade || 0) > 0 
                                            ? "text-orange-600" : "text-green-600"
                                        }`} />
                                      </div>
                                      <p className="text-xs text-slate-500 font-medium mb-1">Cheques s/ Fundo</p>
                                      <p className={`text-2xl font-black ${
                                        (behavioralData?.credito?.resposta?.chequesSemFundo?.quantidade || behavioralData?.credito?.resposta?.cheques?.quantidade || 0) > 0 
                                          ? "text-orange-600" : "text-green-600"
                                      }`}>
                                        {behavioralData?.credito?.resposta?.chequesSemFundo?.quantidade || 
                                         behavioralData?.credito?.resposta?.cheques?.quantidade || 0}
                                      </p>
                                    </div>
                                    
                                    <div className={`p-4 rounded-xl text-center transition-all ${
                                      behavioralData?.acoes?.resposta?.acoes === true || (behavioralData?.acoes?.resposta?.quantidade || 0) > 0
                                        ? "bg-purple-50 border-2 border-purple-200" 
                                        : "bg-green-50 border-2 border-green-200"
                                    }`}>
                                      <div className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center mb-2 ${
                                        behavioralData?.acoes?.resposta?.acoes === true || (behavioralData?.acoes?.resposta?.quantidade || 0) > 0
                                          ? "bg-purple-100" : "bg-green-100"
                                      }`}>
                                        <Shield className={`h-5 w-5 ${
                                          behavioralData?.acoes?.resposta?.acoes === true || (behavioralData?.acoes?.resposta?.quantidade || 0) > 0
                                            ? "text-purple-600" : "text-green-600"
                                        }`} />
                                      </div>
                                      <p className="text-xs text-slate-500 font-medium mb-1">Acoes Judiciais</p>
                                      <p className={`text-2xl font-black ${
                                        behavioralData?.acoes?.resposta?.acoes === true || (behavioralData?.acoes?.resposta?.quantidade || 0) > 0
                                          ? "text-purple-600" : "text-green-600"
                                      }`}>
                                        {behavioralData?.acoes?.resposta?.acoes === true ? "Sim" : 
                                         behavioralData?.acoes?.resposta?.quantidade || "Nao"}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Acoes Judiciais Detalhes */}
                              {behavioralData?.acoes?.resposta?.detalhes && 
                               behavioralData.acoes.resposta.detalhes.length > 0 && (
                                <Card className="border-0 shadow-md overflow-hidden">
                                  <div className="h-1 bg-gradient-to-r from-purple-400 to-indigo-600" />
                                  <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-indigo-50">
                                    <CardTitle className="text-sm font-semibold text-purple-700 flex items-center justify-between">
                                      <span className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                          <Shield className="h-4 w-4 text-purple-600" />
                                        </div>
                                        Acoes Judiciais
                                      </span>
                                      <Badge className="bg-purple-600 text-white">{behavioralData.acoes.resposta.quantidade || behavioralData.acoes.resposta.detalhes.length}</Badge>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-4">
                                    <div className="space-y-3 max-h-48 overflow-y-auto">
                                      {behavioralData.acoes.resposta.detalhes.map((acao: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-white rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div className="flex items-center gap-2">
                                              <FileText className="h-4 w-4 text-purple-400" />
                                              <div>
                                                <p className="text-xs text-slate-400">Tipo</p>
                                                <p className="font-semibold text-slate-800">{acao.tipo || "N/A"}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Building2 className="h-4 w-4 text-purple-400" />
                                              <div>
                                                <p className="text-xs text-slate-400">Vara</p>
                                                <p className="font-semibold text-slate-800">{acao.vara || "N/A"}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <DollarSign className="h-4 w-4 text-purple-400" />
                                              <div>
                                                <p className="text-xs text-slate-400">Valor</p>
                                                <p className="font-bold text-purple-600">
                                                  {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(acao.valor || 0)}
                                                </p>
                                              </div>
                                            </div>
                                            <div>
                                              <p className="text-xs text-slate-400 mb-1">Status</p>
                                              <Badge className={`${acao.status === "Arquivado" ? "bg-slate-100 text-slate-600 hover:bg-slate-100" : "bg-red-100 text-red-700 hover:bg-red-100"}`}>
                                                {acao.status || "N/A"}
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Perfil e Contato */}
                              {behavioralData?.dadosCadastrais?.resposta && (
                                <Card className="border-0 shadow-md overflow-hidden">
                                  <div className="h-1 bg-gradient-to-r from-blue-400 to-cyan-500" />
                                  <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-cyan-50">
                                    <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <User className="h-4 w-4 text-blue-600" />
                                      </div>
                                      Perfil e Contato
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-4 space-y-4">
                                    {/* Dados Pessoais */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      <div className="p-3 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-400 mb-1">Nome</p>
                                        <p className="font-semibold text-sm text-slate-800">{behavioralData.dadosCadastrais.resposta.nome || cliente.Cliente}</p>
                                      </div>
                                      {behavioralData.dadosCadastrais.resposta.dataNascimento && (
                                        <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-slate-400" />
                                          <div>
                                            <p className="text-xs text-slate-400">Nascimento</p>
                                            <p className="font-semibold text-sm text-slate-800">{behavioralData.dadosCadastrais.resposta.dataNascimento}</p>
                                          </div>
                                        </div>
                                      )}
                                      {behavioralData.dadosCadastrais.resposta.sexo && (
                                        <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-2">
                                          <User className="h-4 w-4 text-slate-400" />
                                          <div>
                                            <p className="text-xs text-slate-400">Sexo</p>
                                            <p className="font-semibold text-sm text-slate-800">{behavioralData.dadosCadastrais.resposta.sexo === "M" ? "Masculino" : "Feminino"}</p>
                                          </div>
                                        </div>
                                      )}
                                      <div className="p-3 bg-slate-50 rounded-xl">
                                        <p className="text-xs text-slate-400 mb-1">Situacao CPF</p>
                                        <Badge className={`${behavioralData.dadosCadastrais.resposta.situacaoCPF === "Regular" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}`}>
                                          {behavioralData.dadosCadastrais.resposta.situacaoCPF || "N/A"}
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Endereco */}
                                    {behavioralData.dadosCadastrais.resposta.endereco && (
                                      <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                                        <div className="flex items-start gap-3">
                                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <MapPin className="h-5 w-5 text-blue-600" />
                                          </div>
                                          <div>
                                            <p className="text-xs text-blue-500 font-semibold mb-1">Endereco</p>
                                            <p className="text-sm font-medium text-slate-800">
                                              {behavioralData.dadosCadastrais.resposta.endereco.logradouro || ""}, {behavioralData.dadosCadastrais.resposta.endereco.numero || ""}
                                              {behavioralData.dadosCadastrais.resposta.endereco.complemento && ` - ${behavioralData.dadosCadastrais.resposta.endereco.complemento}`}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                              {behavioralData.dadosCadastrais.resposta.endereco.bairro || ""} - {behavioralData.dadosCadastrais.resposta.endereco.cidade || ""}/{behavioralData.dadosCadastrais.resposta.endereco.uf || ""}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                              CEP: {behavioralData.dadosCadastrais.resposta.endereco.cep || "N/A"}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Telefones */}
                                    {behavioralData.dadosCadastrais.resposta.telefones && 
                                     behavioralData.dadosCadastrais.resposta.telefones.length > 0 && (
                                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                                            <Phone className="h-4 w-4 text-green-600" />
                                          </div>
                                          <p className="text-xs text-green-600 font-semibold">Telefones</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {behavioralData.dadosCadastrais.resposta.telefones.map((tel: any, idx: number) => (
                                            <Badge key={idx} className="bg-white text-green-700 border border-green-200 hover:bg-white px-3 py-1">
                                              ({tel.ddd}) {tel.numero} <span className="text-green-500 ml-1">| {tel.tipo}</span>
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Emails */}
                                    {behavioralData.dadosCadastrais.resposta.emails && 
                                     behavioralData.dadosCadastrais.resposta.emails.length > 0 && (
                                      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                            <Mail className="h-4 w-4 text-indigo-600" />
                                          </div>
                                          <p className="text-xs text-indigo-600 font-semibold">E-mails</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {behavioralData.dadosCadastrais.resposta.emails.map((email: any, idx: number) => (
                                            <Badge key={idx} className="bg-white text-indigo-700 border border-indigo-200 hover:bg-white px-3 py-1">
                                              {email.email} {email.ranking && <span className="text-indigo-400 ml-1">(#{email.ranking})</span>}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )}

                              {/* Capacidade de Pagamento - Renda Presumida */}
                              {behavioralData?.rendaPresumida?.resposta && (
                                <Card className="border-0 shadow-md overflow-hidden">
                                  <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
                                  <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50">
                                    <CardTitle className="text-sm font-semibold text-green-700 flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                                        <DollarSign className="h-4 w-4 text-green-600" />
                                      </div>
                                      Capacidade de Pagamento - Renda Presumida
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 text-center">
                                        <p className="text-xs text-green-500 font-medium mb-2">Faixa</p>
                                        <p className="text-2xl font-black text-green-600">
                                          {behavioralData.rendaPresumida.resposta.faixa || "-"}
                                        </p>
                                      </div>
                                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 text-center">
                                        <p className="text-xs text-green-500 font-medium mb-2">Minimo</p>
                                        <p className="text-lg font-bold text-green-600">
                                          {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                            behavioralData.rendaPresumida.resposta.valorMinimo || 0
                                          )}
                                        </p>
                                      </div>
                                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 text-center">
                                        <p className="text-xs text-green-500 font-medium mb-2">Maximo</p>
                                        <p className="text-lg font-bold text-green-600">
                                          {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                            behavioralData.rendaPresumida.resposta.valorMaximo || 0
                                          )}
                                        </p>
                                      </div>
                                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 text-center">
                                        <p className="text-xs text-green-500 font-medium mb-2">Medio</p>
                                        <p className="text-lg font-bold text-green-600">
                                          {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                            behavioralData.rendaPresumida.resposta.valorMedio || 0
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Renda Presumida Fallback (estrutura antiga) */}
                              {!behavioralData?.rendaPresumida?.resposta && behavioralData?.credito?.resposta?.rendaPresumida?.valor && (
                                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                      <DollarSign className="h-5 w-5 text-green-600" />
                                      Renda Presumida
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-3xl font-bold text-green-600">
                                      {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                        behavioralData.credito.resposta.rendaPresumida.valor
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                      Faixa: {behavioralData.credito.resposta.rendaPresumida.faixa || "N/A"}
                                    </p>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Participacao em Empresas */}
                              {behavioralData?.credito?.resposta?.participacaoEmpresas && (
                                <Card className="border-0 shadow-md overflow-hidden">
                                  <div className="h-1 bg-gradient-to-r from-indigo-400 to-blue-500" />
                                  <CardHeader className="pb-3 bg-gradient-to-r from-indigo-50 to-blue-50">
                                    <CardTitle className="text-sm font-semibold text-indigo-700 flex items-center justify-between">
                                      <span className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                          <Building2 className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        Participacao em Empresas
                                      </span>
                                      <Badge className="bg-indigo-600 text-white">{behavioralData.credito.resposta.participacaoEmpresas.quantidade || 0}</Badge>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-4">
                                    {behavioralData.credito.resposta.participacaoEmpresas.empresas && 
                                     behavioralData.credito.resposta.participacaoEmpresas.empresas.length > 0 ? (
                                      <div className="space-y-3 max-h-48 overflow-y-auto">
                                        {behavioralData.credito.resposta.participacaoEmpresas.empresas.map((empresa: any, idx: number) => (
                                          <div key={idx} className="p-4 bg-white rounded-xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="grid grid-cols-3 gap-3 text-sm">
                                              <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-indigo-400" />
                                                <div>
                                                  <p className="text-xs text-slate-400">CNPJ</p>
                                                  <p className="font-semibold text-slate-800">{empresa.cnpj || "N/A"}</p>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-indigo-400" />
                                                <div>
                                                  <p className="text-xs text-slate-400">Razao Social</p>
                                                  <p className="font-semibold text-slate-800">{empresa.razaoSocial || "N/A"}</p>
                                                </div>
                                              </div>
                                              <div>
                                                <p className="text-xs text-slate-400 mb-1">Participacao</p>
                                                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">{empresa.participacao || "N/A"}</Badge>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-100">
                                        <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-500">Nenhuma participacao encontrada</p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )}

                              {/* Auditoria / Correlacao */}
                              <Card className="border-0 shadow-sm overflow-hidden">
                                <div className="h-1 bg-gradient-to-r from-slate-300 to-gray-400" />
                                <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-gray-50">
                                  <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                      <Shield className="h-4 w-4 text-slate-500" />
                                    </div>
                                    Auditoria / Correlacao
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="p-3 bg-slate-50 rounded-xl">
                                      <p className="text-xs text-slate-400 mb-1">Identificador</p>
                                      <p className="font-mono text-xs text-slate-700 break-all">{cliente.behavioralData?.assertiva_uuid || "-"}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl">
                                      <p className="text-xs text-slate-400 mb-1">Protocolo</p>
                                      <p className="font-mono text-xs text-slate-700 break-all">{cliente.behavioralData?.assertiva_protocol || "-"}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl">
                                      <p className="text-xs text-slate-400 mb-1">Data Processamento</p>
                                      <p className="font-semibold text-sm text-slate-700">
                                        {cliente.behavioralData?.updated_at 
                                          ? new Date(cliente.behavioralData.updated_at).toLocaleString("pt-BR")
                                          : cliente.behavioralData?.created_at 
                                            ? new Date(cliente.behavioralData.created_at).toLocaleString("pt-BR")
                                            : "-"}
                                      </p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl">
                                      <p className="text-xs text-slate-400 mb-1">Documento</p>
                                      <p className="font-semibold text-sm text-slate-700">{cliente["CPF/CNPJ"]}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </>
                          ) : (
                            <Card className="border-0 shadow-md">
                              <CardContent className="py-16 text-center">
                                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                  <User className="h-8 w-8 text-slate-400" />
                                </div>
                                <p className="text-lg font-semibold text-slate-600 mb-2">Analise Comportamental nao realizada</p>
                                <p className="text-sm text-slate-400">Os dados comportamentais ainda nao foram processados para este cliente</p>
                              </CardContent>
                            </Card>
                          )}
                        </TabsContent>
                      </Tabs>
                    </SheetContent>
                  </Sheet>

                  <Button
                    asChild
                    variant="default"
                    size="sm"
                    className="flex-1 gap-2 bg-yellow-500 hover:bg-yellow-600"
                  >
                    <Link href={`/dashboard/clientes/${cliente.id}/negotiate`}>
                      <Handshake className="h-4 w-4" />
                      <span className="hidden sm:inline">Negociar</span>
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 hover:text-red-700 w-10 p-0 flex items-center justify-center bg-transparent"
                    onClick={() => handleDeleteCustomer(cliente.id, cliente.Cliente)}
                    title="Excluir cliente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredAndSortedClientes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "Nenhum cliente encontrado com os filtros aplicados"
                : "Nenhum cliente encontrado para esta empresa"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
