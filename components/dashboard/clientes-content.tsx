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
                    <SheetContent className="w-full sm:max-w-6xl overflow-y-auto">
                      <SheetHeader className="pb-6">
                        <SheetTitle className="text-2xl">{cliente.Cliente}</SheetTitle>
                        <SheetDescription>{cliente["CPF/CNPJ"]} - Detalhes das análises de crédito</SheetDescription>
                      </SheetHeader>

                      <Tabs defaultValue="geral" className="mt-6">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
                          <TabsTrigger value="restritiva">Análise Restritiva</TabsTrigger>
                          <TabsTrigger value="comportamental">Análise Comportamental</TabsTrigger>
                        </TabsList>

                        {/* Aba Visão Geral */}
                        <TabsContent value="geral" className="space-y-6 mt-6 p-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Card Análise Restritiva */}
                            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <span className="h-3 w-3 rounded-full bg-blue-600 inline-block" />
                                  Análise Restritiva
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-blue-600 font-semibold mb-1">Score Crédito</p>
                                    <div className="text-4xl font-bold text-blue-600">
                                      {cliente.credit_score || "-"}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm text-orange-600 font-semibold mb-1">Score Recuperação</p>
                                    <div className="text-4xl font-bold text-orange-600">{scoreRecupere || "-"}</div>
                                    {classeRecupere && (
                                      <Badge
                                        variant="outline"
                                        className="mt-2 bg-orange-100 text-orange-700 border-orange-300"
                                      >
                                        Classe {classeRecupere}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="pt-3 border-t">
                                  <Badge
                                    variant={
                                      cliente.approval_status === "ACEITA"
                                        ? "default"
                                        : cliente.approval_status === "ACEITA_ESPECIAL"
                                          ? "secondary"
                                          : "destructive"
                                    }
                                  >
                                    {cliente.approval_status || "Pendente"}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Card Análise Comportamental */}
                            <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <span className="h-3 w-3 rounded-full bg-amber-600 inline-block" />
                                  Análise Comportamental
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {hasBehavioralData ? (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-blue-600 font-semibold mb-1">Score Crédito</p>
                                      <div className="text-4xl font-bold text-blue-600">
                                        {behavioralCreditScore || "-"}
                                      </div>
                                      {behavioralCreditClass && (
                                        <Badge
                                          variant="outline"
                                          className="mt-2 bg-blue-100 text-blue-700 border-blue-300"
                                        >
                                          Classe {behavioralCreditClass}
                                        </Badge>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-sm text-orange-600 font-semibold mb-1">Score Recuperação</p>
                                      <div className="text-4xl font-bold text-orange-600">
                                        {behavioralRecoveryScore || "-"}
                                      </div>
                                      {behavioralRecoveryClass && (
                                        <Badge
                                          variant="outline"
                                          className="mt-2 bg-orange-100 text-orange-700 border-orange-300"
                                        >
                                          Classe {behavioralRecoveryClass}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">Não realizada</p>
                                )}
                              </CardContent>
                            </Card>
                          </div>

                          {/* Informações Adicionais */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Informações do Cliente</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Localização</p>
                                <p className="font-medium">
                                  {cliente.Cidade || "N/A"}, {cliente.UF || "-"}
                                </p>
                              </div>
                              {cliente.Dias_Inad > 0 && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Inadimplência</p>
                                  <Badge variant="destructive">{cliente.Dias_Inad} dias</Badge>
                                </div>
                              )}
                              {cliente.Vencido &&
                                Number.parseFloat(cliente.Vencido.toString().replace(",", ".")) > 0 && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Valor Vencido</p>
                                    <p className="font-semibold text-red-600">
                                      R$ {Number.parseFloat(cliente.Vencido.toString().replace(",", ".")).toFixed(2)}
                                    </p>
                                  </div>
                                )}
                            </CardContent>
                          </Card>
                        </TabsContent>

                        {/* Aba Análise Restritiva */}
                        <TabsContent value="restritiva" className="space-y-6 mt-6 p-1">
                          {/* Topo - Cards Principais */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Score Crédito */}
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-blue-700">Score Crédito</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-4xl font-bold text-blue-600">
                                    {metadata?.credito?.resposta?.score?.pontos || cliente.credit_score || "-"}
                                  </span>
                                  {metadata?.credito?.resposta?.score?.classe && (
                                    <Badge className="bg-blue-600 text-white">
                                      {metadata.credito.resposta.score.classe}
                                    </Badge>
                                  )}
                                </div>
                                {metadata?.credito?.resposta?.score?.faixa?.titulo && (
                                  <p className="text-sm font-medium text-blue-700 mt-2">
                                    {metadata.credito.resposta.score.faixa.titulo}
                                  </p>
                                )}
                              </CardContent>
                            </Card>

                            {/* Score Recupere */}
                            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-orange-700">Score Recupere</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-4xl font-bold text-orange-600">
                                    {scoreRecupere || "-"}
                                  </span>
                                  {classeRecupere && (
                                    <Badge className="bg-orange-600 text-white">
                                      {classeRecupere}
                                    </Badge>
                                  )}
                                </div>
                                {metadata?.recupere?.resposta?.score?.faixa?.titulo && (
                                  <p className="text-sm font-medium text-orange-700 mt-2">
                                    {metadata.recupere.resposta.score.faixa.titulo}
                                  </p>
                                )}
                                {metadata?.recupere?.resposta?.score?.faixa?.descricao && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {metadata.recupere.resposta.score.faixa.descricao}
                                  </p>
                                )}
                              </CardContent>
                            </Card>

                            {/* Alertas Rápidos */}
                            <Card className="border-2 border-slate-200">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm text-slate-700">Alertas Rápidos</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-muted-foreground">Protestos Públicos</span>
                                  <Badge variant={metadata?.credito?.resposta?.protestosPublicos?.qtdProtestos > 0 ? "destructive" : "secondary"}>
                                    {metadata?.credito?.resposta?.protestosPublicos?.qtdProtestos || 0}
                                  </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-muted-foreground">Últimas Consultas</span>
                                  <Badge variant="secondary">
                                    {metadata?.credito?.resposta?.ultimasConsultas?.qtdUltConsultas || 0}
                                  </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-muted-foreground">Débitos</span>
                                  <Badge variant={metadata?.credito?.resposta?.registrosDebitos?.qtdDebitos > 0 ? "destructive" : "secondary"}>
                                    {metadata?.credito?.resposta?.registrosDebitos?.qtdDebitos || 0}
                                  </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-muted-foreground">Cheques s/ Fundo</span>
                                  <Badge variant={metadata?.credito?.resposta?.cheques?.quantidade > 0 ? "destructive" : "secondary"}>
                                    {metadata?.credito?.resposta?.cheques?.quantidade || 0}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {metadata && (
                            <>
                              {/* Protestos Públicos */}
                              {(metadata.credito?.resposta?.protestosPublicos?.qtdProtestos > 0 || 
                                (metadata.credito?.resposta?.protestosPublicos?.list && metadata.credito.resposta.protestosPublicos.list.length > 0)) && (
                                <Card className="border-2 border-red-200">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                      <AlertCircle className="h-5 w-5 text-red-600" />
                                      Protestos Públicos
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-3 bg-red-50 rounded-lg">
                                        <p className="text-xs text-muted-foreground">Quantidade</p>
                                        <p className="text-2xl font-bold text-red-600">
                                          {metadata.credito.resposta.protestosPublicos.qtdProtestos || 0}
                                        </p>
                                      </div>
                                      <div className="p-3 bg-red-50 rounded-lg">
                                        <p className="text-xs text-muted-foreground">Valor Total</p>
                                        <p className="text-2xl font-bold text-red-600">
                                          {metadata.credito.resposta.protestosPublicos.valorTotal 
                                            ? newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(metadata.credito.resposta.protestosPublicos.valorTotal) || 0)
                                            : "R$ 0,00"}
                                        </p>
                                      </div>
                                    </div>
                                    {metadata.credito.resposta.protestosPublicos.list && metadata.credito.resposta.protestosPublicos.list.length > 0 && (
                                      <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {metadata.credito.resposta.protestosPublicos.list.map((protesto: any, idx: number) => (
                                          <div key={idx} className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                                            <div className="flex justify-between items-start mb-2">
                                              <div>
                                                <p className="font-medium text-sm">{protesto.cartorio || "N/A"}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {protesto.cidade || "N/A"} - {protesto.uf || "N/A"}
                                                </p>
                                              </div>
                                              <Badge variant="destructive">
                                                {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(protesto.valor || 0)}
                                              </Badge>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )}

                              {/* Débitos Financeiros */}
                              {metadata.credito?.resposta?.registrosDebitos?.list &&
                                metadata.credito.resposta.registrosDebitos.list.length > 0 && (
                                  <Card className="border-2 border-purple-200">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-purple-600" />
                                        Débitos Financeiros
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-purple-50 rounded-lg">
                                          <p className="text-xs text-muted-foreground">Quantidade</p>
                                          <p className="text-2xl font-bold text-purple-600">
                                            {metadata.credito.resposta.registrosDebitos.qtdDebitos || 0}
                                          </p>
                                        </div>
                                        <div className="p-3 bg-purple-50 rounded-lg">
                                          <p className="text-xs text-muted-foreground">Valor Total</p>
                                          <p className="text-2xl font-bold text-purple-600">
                                            {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(metadata.credito.resposta.registrosDebitos.valorTotal || 0)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {metadata.credito.resposta.registrosDebitos.list.map((debito: any, idx: number) => (
                                          <div key={idx} className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                              <div>
                                                <p className="text-xs text-muted-foreground">Credor</p>
                                                <p className="font-bold">{debito.credor || "N/A"}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-muted-foreground">Valor</p>
                                                <p className="font-bold text-purple-600">
                                                  {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(debito.valor || 0)}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-muted-foreground">Data Vencimento</p>
                                                <p className="font-medium">{debito.dataVencimento || "N/A"}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-muted-foreground">Cidade/UF</p>
                                                <p className="font-medium">{debito.cidade || "N/A"}/{debito.uf || "N/A"}</p>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                              {/* Cheques sem Fundos */}
                              <Card className="border-2 border-orange-200">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-orange-600" />
                                    Cheques sem Fundos
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {metadata.credito?.resposta?.cheques?.quantidade > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-4 bg-orange-50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Quantidade</p>
                                        <p className="text-3xl font-bold text-orange-600">
                                          {metadata.credito.resposta.cheques.quantidade || 0}
                                        </p>
                                      </div>
                                      <div className="p-4 bg-orange-50 rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
                                        <p className="text-2xl font-bold text-orange-600">
                                          {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(metadata.credito.resposta.cheques.valorTotal || 0)}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4">
                                      <p className="text-sm font-medium text-green-700">Nenhum cheque sem fundo encontrado</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Últimas Consultas */}
                              <Card className="border-2 border-blue-200">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <Eye className="h-5 w-5 text-blue-600" />
                                    Últimas Consultas ({metadata.credito?.resposta?.ultimasConsultas?.qtdUltConsultas || 0})
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {metadata.credito?.resposta?.ultimasConsultas?.list && metadata.credito.resposta.ultimasConsultas.list.length > 0 ? (
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                      {metadata.credito.resposta.ultimasConsultas.list.slice(0, 10).map((consulta: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                          <p className="text-sm font-medium">{consulta.dataOcorrencia}</p>
                                          <p className="text-xs text-muted-foreground">Consulta realizada</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-4">
                                      <p className="text-sm text-muted-foreground">Nenhuma consulta registrada</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Metadados / Auditoria */}
                              <Card className="border">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base">Auditoria / Metadados</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Protocolo Crédito</p>
                                      <p className="font-mono text-xs break-all">{metadata.credito?.cabecalho?.protocolo || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Protocolo Recupere</p>
                                      <p className="font-mono text-xs break-all">{metadata.recupere?.cabecalho?.protocolo || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Data/Hora Crédito</p>
                                      <p className="font-medium">{metadata.credito?.cabecalho?.dataHora || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Data/Hora Recupere</p>
                                      <p className="font-medium">{metadata.recupere?.cabecalho?.dataHora || "-"}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </>
                          )}

                          {!metadata && (
                            <Card className="border-2 border-dashed">
                              <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">Nenhuma análise restritiva realizada para este cliente.</p>
                              </CardContent>
                            </Card>
                          )}
                        </TabsContent>

                        {/* Aba Análise Comportamental */}
                        <TabsContent value="comportamental" className="space-y-6 mt-6 p-1">
                          {hasBehavioralData ? (
                            <>
                              {/* Topo - Scores principais */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Score Crédito */}
                                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-blue-700">Score Crédito</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-4xl font-bold text-blue-600">
                                        {behavioralCreditScore || "-"}
                                      </span>
                                      {behavioralCreditClass && (
                                        <Badge className="bg-blue-600 text-white">{behavioralCreditClass}</Badge>
                                      )}
                                    </div>
                                    {behavioralData?.credito?.resposta?.score?.faixa?.titulo && (
                                      <p className="text-sm font-medium text-blue-700 mt-2">
                                        {behavioralData.credito.resposta.score.faixa.titulo}
                                      </p>
                                    )}
                                    {behavioralData?.credito?.resposta?.score?.probabilidade && (
                                      <p className="text-xs text-muted-foreground">
                                        Probabilidade: {behavioralData.credito.resposta.score.probabilidade}%
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>

                                {/* Score Recupere */}
                                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-orange-700">Score Recupere</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-4xl font-bold text-orange-600">
                                        {behavioralRecoveryScore || "-"}
                                      </span>
                                      {behavioralRecoveryClass && (
                                        <Badge className="bg-orange-600 text-white">{behavioralRecoveryClass}</Badge>
                                      )}
                                    </div>
                                    {behavioralData?.recupere?.resposta?.score?.faixa?.titulo && (
                                      <p className="text-sm font-medium text-orange-700 mt-2">
                                        {behavioralData.recupere.resposta.score.faixa.titulo}
                                      </p>
                                    )}
                                    {behavioralData?.recupere?.resposta?.score?.probabilidade && (
                                      <p className="text-xs text-muted-foreground">
                                        Probabilidade: {behavioralData.recupere.resposta.score.probabilidade}%
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>

                                {/* Projeção de Recuperação */}
                                <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-teal-700">Projeção de Recuperação</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-muted-foreground">30 dias</span>
                                      <span className="font-bold text-teal-600">
                                        {behavioralData?.recupere?.resposta?.projecaoRecuperacao?.probabilidade30dias || behavioralData?.projecaoRecuperacao?.probabilidade30dias || "-"}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-muted-foreground">60 dias</span>
                                      <span className="font-bold text-teal-600">
                                        {behavioralData?.recupere?.resposta?.projecaoRecuperacao?.probabilidade60dias || behavioralData?.projecaoRecuperacao?.probabilidade60dias || "-"}%
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-muted-foreground">90 dias</span>
                                      <span className="font-bold text-teal-600">
                                        {behavioralData?.recupere?.resposta?.projecaoRecuperacao?.probabilidade90dias || behavioralData?.projecaoRecuperacao?.probabilidade90dias || "-"}%
                                      </span>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>

                              {/* Risco / Restrições */}
                              <Card className="border-2 border-red-200">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                    Risco / Restrições
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-3 bg-red-50 rounded-lg">
                                      <p className="text-xs text-muted-foreground">Pendências Financeiras</p>
                                      <p className="text-xl font-bold text-red-600">
                                        {behavioralData?.credito?.resposta?.pendenciasFinanceiras?.quantidade || behavioralData?.pendenciasFinanceiras?.quantidade || 0}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                          behavioralData?.credito?.resposta?.pendenciasFinanceiras?.valorTotal || behavioralData?.pendenciasFinanceiras?.valorTotal || 0
                                        )}
                                      </p>
                                    </div>
                                    <div className="p-3 bg-red-50 rounded-lg">
                                      <p className="text-xs text-muted-foreground">Protestos</p>
                                      <p className="text-xl font-bold text-red-600">
                                        {behavioralData?.credito?.resposta?.protestos?.quantidade || behavioralData?.protestos?.quantidade || 0}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                          behavioralData?.credito?.resposta?.protestos?.valorTotal || behavioralData?.protestos?.valorTotal || 0
                                        )}
                                      </p>
                                    </div>
                                    <div className="p-3 bg-orange-50 rounded-lg">
                                      <p className="text-xs text-muted-foreground">Cheques s/ Fundo</p>
                                      <p className="text-xl font-bold text-orange-600">
                                        {behavioralData?.credito?.resposta?.chequesSemFundo?.quantidade || behavioralData?.chequesSemFundo?.quantidade || 0}
                                      </p>
                                    </div>
                                    <div className="p-3 bg-purple-50 rounded-lg">
                                      <p className="text-xs text-muted-foreground">Ações Judiciais</p>
                                      <p className="text-xl font-bold text-purple-600">
                                        {behavioralData?.acoes?.resposta?.acoes ? "Sim" : "Não"}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Qtd: {behavioralData?.acoes?.resposta?.quantidade || 0}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Detalhes das Ações Judiciais */}
                                  {behavioralData?.acoes?.resposta?.detalhes && behavioralData.acoes.resposta.detalhes.length > 0 && (
                                    <div className="mt-4">
                                      <p className="text-sm font-semibold mb-2">Detalhes das Ações Judiciais</p>
                                      <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {behavioralData.acoes.resposta.detalhes.map((acao: any, idx: number) => (
                                          <div key={idx} className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500 text-sm">
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                              <div>
                                                <p className="text-xs text-muted-foreground">Tipo</p>
                                                <p className="font-medium">{acao.tipo || "N/A"}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-muted-foreground">Vara</p>
                                                <p className="font-medium">{acao.vara || "N/A"}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-muted-foreground">Comarca</p>
                                                <p className="font-medium">{acao.comarca || "N/A"}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-muted-foreground">Data Distribuição</p>
                                                <p className="font-medium">{acao.dataDistribuicao || "N/A"}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-muted-foreground">Valor</p>
                                                <p className="font-medium text-purple-600">
                                                  {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(acao.valor || 0)}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-muted-foreground">Status</p>
                                                <Badge variant={acao.status === "Em andamento" ? "destructive" : "secondary"}>
                                                  {acao.status || "N/A"}
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Perfil e Contato */}
                              <Card className="border-2 border-slate-200">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base">Perfil e Contato</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Dados Pessoais */}
                                    <div className="space-y-3">
                                      <p className="text-sm font-semibold text-slate-700">Dados Cadastrais</p>
                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                          <p className="text-xs text-muted-foreground">Nome</p>
                                          <p className="font-medium">{behavioralData?.dadosCadastrais?.resposta?.nome || "-"}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Data Nascimento</p>
                                          <p className="font-medium">{behavioralData?.dadosCadastrais?.resposta?.dataNascimento || "-"}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Sexo</p>
                                          <p className="font-medium">{behavioralData?.dadosCadastrais?.resposta?.sexo === "M" ? "Masculino" : behavioralData?.dadosCadastrais?.resposta?.sexo === "F" ? "Feminino" : "-"}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Situação CPF</p>
                                          <Badge variant={behavioralData?.dadosCadastrais?.resposta?.situacaoCPF === "Regular" ? "default" : "destructive"}>
                                            {behavioralData?.dadosCadastrais?.resposta?.situacaoCPF || "-"}
                                          </Badge>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Óbito</p>
                                          <Badge variant={behavioralData?.dadosCadastrais?.resposta?.obito ? "destructive" : "secondary"}>
                                            {behavioralData?.dadosCadastrais?.resposta?.obito ? "Sim" : "Não"}
                                          </Badge>
                                        </div>
                                      </div>

                                      {/* Endereço */}
                                      {behavioralData?.dadosCadastrais?.resposta?.endereco && (
                                        <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                                          <p className="text-xs text-muted-foreground mb-1">Endereço</p>
                                          <p className="text-sm">
                                            {behavioralData.dadosCadastrais.resposta.endereco.logradouro}, {behavioralData.dadosCadastrais.resposta.endereco.numero}
                                            {behavioralData.dadosCadastrais.resposta.endereco.complemento && ` - ${behavioralData.dadosCadastrais.resposta.endereco.complemento}`}
                                          </p>
                                          <p className="text-sm">
                                            {behavioralData.dadosCadastrais.resposta.endereco.bairro} - {behavioralData.dadosCadastrais.resposta.endereco.cidade}/{behavioralData.dadosCadastrais.resposta.endereco.uf}
                                          </p>
                                          <p className="text-sm">CEP: {behavioralData.dadosCadastrais.resposta.endereco.cep}</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Contatos */}
                                    <div className="space-y-3">
                                      {/* Telefones */}
                                      <div>
                                        <p className="text-sm font-semibold text-slate-700 mb-2">Telefones</p>
                                        {behavioralData?.dadosCadastrais?.resposta?.telefones && behavioralData.dadosCadastrais.resposta.telefones.length > 0 ? (
                                          <div className="space-y-2">
                                            {behavioralData.dadosCadastrais.resposta.telefones.map((tel: any, idx: number) => (
                                              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                                <span className="text-sm font-mono">({tel.ddd}) {tel.numero}</span>
                                                <Badge variant="outline">{tel.tipo}</Badge>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-muted-foreground">Nenhum telefone encontrado</p>
                                        )}
                                      </div>

                                      {/* E-mails */}
                                      <div>
                                        <p className="text-sm font-semibold text-slate-700 mb-2">E-mails</p>
                                        {behavioralData?.dadosCadastrais?.resposta?.emails && behavioralData.dadosCadastrais.resposta.emails.length > 0 ? (
                                          <div className="space-y-2">
                                            {behavioralData.dadosCadastrais.resposta.emails.map((email: any, idx: number) => (
                                              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                                <span className="text-sm">{email.email}</span>
                                                <Badge variant="outline">Rank {email.ranking}</Badge>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-muted-foreground">Nenhum e-mail encontrado</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Capacidade de Pagamento - Renda Presumida */}
                              <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                    Capacidade de Pagamento - Renda Presumida
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-3 bg-green-100 rounded-lg">
                                      <p className="text-xs text-muted-foreground">Faixa</p>
                                      <p className="text-2xl font-bold text-green-700">
                                        {behavioralData?.rendaPresumida?.resposta?.faixa || behavioralData?.rendaPresumida?.faixa || "-"}
                                      </p>
                                    </div>
                                    <div className="p-3 bg-green-100 rounded-lg">
                                      <p className="text-xs text-muted-foreground">Mínimo</p>
                                      <p className="text-lg font-bold text-green-700">
                                        {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                          behavioralData?.rendaPresumida?.resposta?.valorMinimo || behavioralData?.rendaPresumida?.valorMinimo || 0
                                        )}
                                      </p>
                                    </div>
                                    <div className="p-3 bg-green-100 rounded-lg">
                                      <p className="text-xs text-muted-foreground">Máximo</p>
                                      <p className="text-lg font-bold text-green-700">
                                        {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                          behavioralData?.rendaPresumida?.resposta?.valorMaximo || behavioralData?.rendaPresumida?.valorMaximo || 0
                                        )}
                                      </p>
                                    </div>
                                    <div className="p-3 bg-green-100 rounded-lg">
                                      <p className="text-xs text-muted-foreground">Médio</p>
                                      <p className="text-lg font-bold text-green-700">
                                        {newIntl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                          behavioralData?.rendaPresumida?.resposta?.valorMedio || behavioralData?.rendaPresumida?.valorMedio || 0
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Participação em Empresas */}
                              {(behavioralData?.credito?.resposta?.participacaoEmpresas?.quantidade > 0 || 
                                (behavioralData?.participacaoEmpresas?.empresas && behavioralData.participacaoEmpresas.empresas.length > 0)) && (
                                <Card className="border-2 border-indigo-200">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-base">
                                      Participação em Empresas ({behavioralData?.credito?.resposta?.participacaoEmpresas?.quantidade || behavioralData?.participacaoEmpresas?.quantidade || 0})
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {(behavioralData?.credito?.resposta?.participacaoEmpresas?.empresas || behavioralData?.participacaoEmpresas?.empresas || []).map((empresa: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
                                          <div className="grid grid-cols-3 gap-2 text-sm">
                                            <div>
                                              <p className="text-xs text-muted-foreground">CNPJ</p>
                                              <p className="font-mono">{empresa.cnpj || "N/A"}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-muted-foreground">Razão Social</p>
                                              <p className="font-medium">{empresa.razaoSocial || "N/A"}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-muted-foreground">Participação</p>
                                              <Badge variant="outline">{empresa.participacao || "N/A"}</Badge>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Auditoria / Correlação */}
                              <Card className="border">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base">Auditoria / Correlação</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Identificador</p>
                                      <p className="font-mono text-xs break-all">{behavioralData?.cabecalho?.identificador || cliente.behavioralData?.assertiva_uuid || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Protocolo</p>
                                      <p className="font-mono text-xs break-all">{behavioralData?.cabecalho?.protocolo || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Data Processamento</p>
                                      <p className="font-medium">{behavioralData?.cabecalho?.dataProcessamento || cliente.behavioralData?.updated_at || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Documento/Tipo</p>
                                      <p className="font-medium">{behavioralData?.cabecalho?.entrada?.documento || cliente["CPF/CNPJ"]} / {behavioralData?.cabecalho?.entrada?.tipoDocumento || (cliente["CPF/CNPJ"]?.length > 14 ? "CNPJ" : "CPF")}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </>
                          ) : (
                            <Card className="border-2 border-dashed">
                              <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">Nenhuma análise comportamental realizada para este cliente.</p>
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
