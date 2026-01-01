"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Eye, Sparkles, Plus, Search, ArrowUpDown, ArrowUp, ArrowDown, Handshake } from "lucide-react"

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

          console.log(
            "[v0] Cliente:",
            cliente.Cliente,
            "metadata:",
            metadata,
            "scoreRecupere:",
            scoreRecupere,
            "classeRecupere:",
            classeRecupere,
          )

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
                <div className="grid grid-cols-2 gap-2">
                  {/* Score de Crédito */}
                  <div className="border rounded-lg p-3 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="text-xs text-purple-600 font-semibold">Score Crédito</span>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-purple-600">{cliente.credit_score || "-"}</div>
                    <p className="text-xs text-muted-foreground mt-1">Análise de Crédito</p>
                  </div>

                  {/* Score Recupere */}
                  <div className="border rounded-lg p-3 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs text-emerald-600 font-semibold">Score Recupere</span>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-emerald-600">{scoreRecupere || "-"}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {classeRecupere ? `Classe ${classeRecupere}` : "Recuperação"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col gap-1 p-2 rounded bg-muted">
                    <span className="text-muted-foreground">Risco Crédito</span>
                    <Badge
                      variant={
                        cliente.approval_status === "ACEITA"
                          ? "default"
                          : cliente.approval_status === "ACEITA_ESPECIAL"
                            ? "secondary"
                            : "destructive"
                      }
                      className="w-fit"
                    >
                      {cliente.approval_status === "ACEITA"
                        ? "Baixo"
                        : cliente.approval_status === "REJEITA"
                          ? "Alto"
                          : "Médio"}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 p-2 rounded bg-muted">
                    <span className="text-muted-foreground">Classe Recupere</span>
                    <Badge
                      variant={classeRecupere ? "outline" : "secondary"}
                      className="w-fit bg-emerald-100 text-emerald-700 border-emerald-300"
                    >
                      {classeRecupere || "N/A"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 text-xs md:text-sm">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground shrink-0">Cidade:</span>
                    <span className="font-medium truncate min-w-0">{cliente.Cidade || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground shrink-0">UF:</span>
                    <span className="font-medium">{cliente.UF || "N/A"}</span>
                  </div>
                </div>

                {cliente.Dias_Inad && cliente.Dias_Inad > 0 && (
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-muted-foreground">Inadimplência:</span>
                    <Badge
                      variant="destructive"
                      className={
                        cliente.Dias_Inad <= 30
                          ? "bg-yellow-500"
                          : cliente.Dias_Inad <= 60
                            ? "bg-orange-500"
                            : cliente.Dias_Inad <= 90
                              ? "bg-red-500"
                              : "bg-red-700"
                      }
                    >
                      {cliente.Dias_Inad} dias
                    </Badge>
                  </div>
                )}

                {cliente.Vencido && Number.parseFloat(cliente.Vencido.toString().replace(",", ".")) > 0 && (
                  <div className="flex justify-between items-center text-xs md:text-sm">
                    <span className="text-muted-foreground">Valor Vencido:</span>
                    <span className="font-semibold text-red-600">
                      R$ {Number.parseFloat(cliente.Vencido.toString().replace(",", ".")).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1 gap-2 bg-transparent">
                    <Link href={`/dashboard/clientes/${cliente.id}`}>
                      <Eye className="h-4 w-4" />
                      Ver Detalhes
                    </Link>
                  </Button>
                  <Button asChild variant="default" size="sm" className="flex-1 gap-2">
                    <Link href={`/dashboard/clientes/${cliente.id}/negotiate`}>
                      <Handshake className="h-4 w-4" />
                      Negociar
                    </Link>
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
