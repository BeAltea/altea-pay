"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
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
          const behavioralCreditScore = behavioralData?.credito?.resposta?.score?.pontos
          const behavioralCreditClass = behavioralData?.credito?.resposta?.score?.classe
          const behavioralRecoveryScore = behavioralData?.recupere?.resposta?.score?.pontos
          const behavioralRecoveryClass = behavioralData?.recupere?.resposta?.score?.classe

          const hasBehavioralData = behavioralData && (behavioralCreditScore || behavioralRecoveryScore)

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
                {/* Análise Restritiva */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-blue-600" />
                    Análise Restritiva
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Crédito</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-lg font-bold text-blue-600">{cliente.credit_score || "-"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Recuperação</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-lg font-bold text-orange-600">{scoreRecupere || "-"}</p>
                        {classeRecupere && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 px-1 bg-orange-100 text-orange-700 border-orange-300"
                          >
                            {classeRecupere}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Análise Comportamental */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-3 rounded-lg border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-amber-600" />
                    Análise Comportamental
                  </p>
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
                        <p className="text-sm text-muted-foreground">{cliente["CPF/CNPJ"]}</p>
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
                                  <div className="h-3 w-3 rounded-full bg-blue-600" />
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
                                  <div className="h-3 w-3 rounded-full bg-amber-600" />
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-blue-700">Score de Crédito</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-5xl font-bold text-blue-600">{cliente.credit_score || "-"}</div>
                                <Badge variant="outline" className="mt-2 bg-blue-100 text-blue-700 border-blue-300">
                                  {cliente.approval_status || "Pendente"}
                                </Badge>
                                {metadata?.credito?.resposta?.score?.faixa && (
                                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <p className="text-xs font-semibold text-blue-700">
                                      {metadata.credito.resposta.score.faixa.titulo}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {metadata.credito.resposta.score.faixa.descricao}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-orange-700">Score de Recuperação</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-5xl font-bold text-orange-600">{scoreRecupere || "-"}</div>
                                {classeRecupere && (
                                  <Badge
                                    variant="outline"
                                    className="mt-2 bg-orange-100 text-orange-700 border-orange-300"
                                  >
                                    Classe {classeRecupere}
                                  </Badge>
                                )}
                                {metadata?.recupere?.resposta?.score?.faixa && (
                                  <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                                    <p className="text-xs font-semibold text-orange-700">
                                      {metadata.recupere.resposta.score.faixa.titulo}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {metadata.recupere.resposta.score.faixa.descricao}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </div>

                          {metadata && (
                            <>
                              {metadata.acoes?.resposta?.protestos?.list &&
                                metadata.acoes.resposta.protestos.list.length > 0 && (
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
                                            {metadata.acoes.resposta.protestos.qtdProtestos || 0}
                                          </p>
                                        </div>
                                        <div className="p-3 bg-red-50 rounded-lg">
                                          <p className="text-xs text-muted-foreground">Valor Total</p>
                                          <p className="text-2xl font-bold text-red-600">
                                            {newIntl
                                              .NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                                              .format(metadata.acoes.resposta.protestos.valorTotal || 0)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {metadata.acoes.resposta.protestos.list.map((protesto: any, idx: number) => (
                                          <div key={idx} className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                                            <div className="flex justify-between items-start mb-2">
                                              <div>
                                                <p className="font-medium text-sm">{protesto.cartorio}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {protesto.cidade} - {protesto.uf}
                                                </p>
                                              </div>
                                              <Badge variant="destructive">
                                                {newIntl
                                                  .NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                                                  .format(protesto.valor)}
                                              </Badge>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

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
                                            {newIntl
                                              .NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                                              .format(metadata.credito.resposta.registrosDebitos.valorTotal || 0)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {metadata.credito.resposta.registrosDebitos.list.map(
                                          (debito: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500"
                                            >
                                              <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                  <p className="text-xs text-muted-foreground">Credor</p>
                                                  <p className="font-bold">{debito.credor || "N/A"}</p>
                                                </div>
                                                <div>
                                                  <p className="text-xs text-muted-foreground">Valor</p>
                                                  <p className="font-bold text-purple-600">
                                                    {newIntl
                                                      .NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                                                      .format(debito.valor || 0)}
                                                  </p>
                                                </div>
                                                <div>
                                                  <p className="text-xs text-muted-foreground">Data Vencimento</p>
                                                  <p className="font-medium">{debito.dataVencimento || "N/A"}</p>
                                                </div>
                                                <div>
                                                  <p className="text-xs text-muted-foreground">Cidade/UF</p>
                                                  <p className="font-medium">
                                                    {debito.cidade || "N/A"}/{debito.uf || "N/A"}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                              {metadata.credito?.resposta?.cheques && (
                                <Card className="border-2 border-orange-200">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                      <AlertCircle className="h-5 w-5 text-orange-600" />
                                      Cheques sem Fundos
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    {metadata.credito.resposta.cheques.quantidade > 0 ? (
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
                                            {newIntl
                                              .NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                                              .format(metadata.credito.resposta.cheques.valorTotal || 0)}
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center py-8">
                                        <p className="text-sm font-medium text-green-700">
                                          Nenhum cheque sem fundo encontrado
                                        </p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )}

                              {metadata.credito?.resposta?.rendaPresumida?.valor && (
                                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                      <DollarSign className="h-5 w-5 text-green-600" />
                                      Renda Presumida
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-3xl font-bold text-green-600">
                                      {newIntl
                                        .NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                                        .format(metadata.credito.resposta.rendaPresumida.valor)}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                      Faixa: {metadata.credito.resposta.rendaPresumida.faixa || "N/A"}
                                    </p>
                                  </CardContent>
                                </Card>
                              )}

                              {metadata.credito?.resposta?.ultimasConsultas?.list &&
                                metadata.credito.resposta.ultimasConsultas.list.length > 0 && (
                                  <Card className="border-2 border-blue-200">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center gap-2">
                                        <Eye className="h-5 w-5 text-blue-600" />
                                        Últimas Consultas (
                                        {metadata.credito.resposta.ultimasConsultas.qtdUltConsultas || 0})
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {metadata.credito.resposta.ultimasConsultas.list
                                          .slice(0, 10)
                                          .map((consulta: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500"
                                            >
                                              <p className="text-sm font-medium">{consulta.dataOcorrencia}</p>
                                              <p className="text-xs text-muted-foreground">Consulta realizada</p>
                                            </div>
                                          ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sanções CEIS */}
                                {metadata.sancoes_ceis !== undefined && (
                                  <Card className="border-2">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                        Sanções CEIS
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="text-3xl font-bold mb-2">{metadata.sancoes_ceis}</div>
                                      <Badge variant={metadata.sancoes_ceis > 0 ? "destructive" : "default"}>
                                        {metadata.sancoes_ceis > 0 ? "Com sanções" : "Sem sanções"}
                                      </Badge>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Punições CNEP */}
                                {metadata.punicoes_cnep !== undefined && (
                                  <Card className="border-2">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-orange-500" />
                                        Punições CNEP
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="text-3xl font-bold mb-2">{metadata.punicoes_cnep}</div>
                                      <Badge variant={metadata.punicoes_cnep > 0 ? "destructive" : "default"}>
                                        {metadata.punicoes_cnep > 0 ? "Com punições" : "Sem punições"}
                                      </Badge>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Faturamento/Receita Estimado */}
                                {metadata.faturamentoPresumido !== undefined && (
                                  <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-green-600" />
                                        Faturamento Estimado (Anual)
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <p className="text-3xl font-bold text-green-600">
                                        R${" "}
                                        {(metadata.faturamentoPresumido || 0).toLocaleString("pt-BR", {
                                          minimumFractionDigits: 2,
                                        })}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-2">
                                        Estimativa baseada em dados públicos
                                      </p>
                                    </CardContent>
                                  </Card>
                                )}
                              </div>
                            </>
                          )}
                        </TabsContent>

                        {/* Aba Análise Comportamental */}
                        <TabsContent value="comportamental" className="space-y-6 mt-6 p-1">
                          {hasBehavioralData ? (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm text-blue-700">Score de Crédito</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-5xl font-bold text-blue-600">
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
                                    {behavioralData?.credito?.resposta?.score?.faixa && (
                                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                        <p className="text-xs font-semibold text-blue-700">
                                          {behavioralData.credito.resposta.score.faixa.titulo}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {behavioralData.credito.resposta.score.faixa.descricao}
                                        </p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-sm text-orange-700">Score de Recuperação</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-5xl font-bold text-orange-600">
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
                                    {behavioralData?.recupere?.resposta?.score?.faixa && (
                                      <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                                        <p className="text-xs font-semibold text-orange-700">
                                          {behavioralData.recupere.resposta.score.faixa.titulo}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {behavioralData.recupere.resposta.score.faixa.descricao}
                                        </p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>

                              {behavioralData?.acoes?.resposta?.protestos?.list &&
                                behavioralData.acoes.resposta.protestos.list.length > 0 && (
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
                                            {behavioralData.acoes.resposta.protestos.qtdProtestos || 0}
                                          </p>
                                        </div>
                                        <div className="p-3 bg-red-50 rounded-lg">
                                          <p className="text-xs text-muted-foreground">Valor Total</p>
                                          <p className="text-2xl font-bold text-red-600">
                                            {newIntl
                                              .NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                                              .format(behavioralData.acoes.resposta.protestos.valorTotal || 0)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {behavioralData.acoes.resposta.protestos.list.map(
                                          (protesto: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500"
                                            >
                                              <div className="flex justify-between items-start mb-2">
                                                <div>
                                                  <p className="font-medium text-sm">{protesto.cartorio}</p>
                                                  <p className="text-xs text-muted-foreground">
                                                    {protesto.cidade} - {protesto.uf}
                                                  </p>
                                                </div>
                                                <Badge variant="destructive">
                                                  {newIntl
                                                    .NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                                                    .format(protesto.valor)}
                                                </Badge>
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                              {behavioralData?.credito?.resposta?.registrosDebitos?.list &&
                                behavioralData.credito.resposta.registrosDebitos.list.length > 0 && (
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
                                            {behavioralData.credito.resposta.registrosDebitos.qtdDebitos || 0}
                                          </p>
                                        </div>
                                        <div className="p-3 bg-purple-50 rounded-lg">
                                          <p className="text-xs text-muted-foreground">Valor Total</p>
                                          <p className="text-2xl font-bold text-purple-600">
                                            {newIntl
                                              .NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                                              .format(behavioralData.credito.resposta.registrosDebitos.valorTotal || 0)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {behavioralData.credito.resposta.registrosDebitos.list.map(
                                          (debito: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500"
                                            >
                                              <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                  <p className="text-xs text-muted-foreground">Credor</p>
                                                  <p className="font-bold">{debito.credor || "N/A"}</p>
                                                </div>
                                                <div>
                                                  <p className="text-xs text-muted-foreground">Valor</p>
                                                  <p className="font-bold text-purple-600">
                                                    {newIntl
                                                      .NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                                                      .format(debito.valor || 0)}
                                                  </p>
                                                </div>
                                                <div>
                                                  <p className="text-xs text-muted-foreground">Data Vencimento</p>
                                                  <p className="font-medium">{debito.dataVencimento || "N/A"}</p>
                                                </div>
                                                <div>
                                                  <p className="text-xs text-muted-foreground">Cidade/UF</p>
                                                  <p className="font-medium">
                                                    {debito.cidade || "N/A"}/{debito.uf || "N/A"}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

                              {behavioralData?.credito?.resposta?.cheques && (
                                <Card className="border-2 border-orange-200">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                      <AlertCircle className="h-5 w-5 text-orange-600" />
                                      Cheques sem Fundos
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    {behavioralData.credito.resposta.cheques.quantidade > 0 ? (
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-orange-50 rounded-lg">
                                          <p className="text-xs text-muted-foreground mb-1">Quantidade</p>
                                          <p className="text-3xl font-bold text-orange-600">
                                            {behavioralData.credito.resposta.cheques.quantidade || 0}
                                          </p>
                                        </div>
                                        <div className="p-4 bg-orange-50 rounded-lg">
                                          <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
                                          <p className="text-2xl font-bold text-orange-600">
                                            {newIntl
                                              .NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                                              .format(behavioralData.credito.resposta.cheques.valorTotal || 0)}
                                          </p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center py-8">
                                        <p className="text-sm font-medium text-green-700">
                                          Nenhum cheque sem fundo encontrado
                                        </p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              )}

                              {behavioralData?.credito?.resposta?.faturamentoEstimado?.valor && (
                                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                                  <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                      <DollarSign className="h-5 w-5 text-green-600" />
                                      Faturamento Estimado (Anual)
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-3xl font-bold text-green-600">
                                      {newIntl
                                        .NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                                        .format(behavioralData.credito.resposta.faturamentoEstimado.valor)}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Estimativa baseada em dados públicos
                                    </p>
                                  </CardContent>
                                </Card>
                              )}

                              {behavioralData?.credito?.resposta?.ultimasConsultas?.list &&
                                behavioralData.credito.resposta.ultimasConsultas.list.length > 0 && (
                                  <Card className="border-2 border-blue-200">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center gap-2">
                                        <Eye className="h-5 w-5 text-blue-600" />
                                        Últimas Consultas (
                                        {behavioralData.credito.resposta.ultimasConsultas.qtdUltConsultas || 0})
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {behavioralData.credito.resposta.ultimasConsultas.list
                                          .slice(0, 10)
                                          .map((consulta: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500"
                                            >
                                              <p className="text-sm font-medium">{consulta.dataOcorrencia}</p>
                                              <p className="text-xs text-muted-foreground">Consulta realizada</p>
                                            </div>
                                          ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}
                              {/* Classificação de Score Comportamental */}
                              <Card className="bg-gradient-to-br from-amber-50 to-yellow-50">
                                <CardHeader>
                                  <CardTitle className="text-base">Classificação de Score Comportamental</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">Classe A</span>
                                    <span className="text-muted-foreground">Excelente (900-1000)</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">Classe B</span>
                                    <span className="text-muted-foreground">Muito Bom (700-899)</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">Classe C</span>
                                    <span className="text-muted-foreground">Bom (500-699)</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">Classe D</span>
                                    <span className="text-muted-foreground">Regular (300-499)</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">Classe E</span>
                                    <span className="text-muted-foreground">Baixo (100-299)</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">Classe F</span>
                                    <span className="text-muted-foreground">Muito Baixo (0-99)</span>
                                  </div>
                                </CardContent>
                              </Card>
                            </>
                          ) : (
                            <Card>
                              <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground italic">Análise comportamental não realizada</p>
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
