"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, X, ArrowUpDown, SlidersHorizontal } from "lucide-react"

interface Debt {
  id: string
  description: string
  amount: number
  due_date: string
  status: string
  classification: string
  propensity_payment_score: number
  customers: {
    name: string
    email: string
  }
}

interface DebtFiltersProps {
  debts: Debt[]
  onFilter: (filteredDebts: Debt[]) => void
}

export function DebtFilters({ debts, onFilter }: DebtFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [classificationFilter, setClassificationFilter] = useState("all")
  const [sortBy, setSortBy] = useState("due_date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [propensityFilter, setPropensityFilter] = useState("all")
  const [amountFilter, setAmountFilter] = useState("all")

  useEffect(() => {
    applyFilters()
  }, [searchTerm, statusFilter, classificationFilter, sortBy, sortOrder, propensityFilter, amountFilter, debts])

  const applyFilters = () => {
    let filtered = [...debts]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (debt) =>
          debt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          debt.customers.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          debt.customers.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((debt) => debt.status === statusFilter)
    }

    // Classification filter
    if (classificationFilter !== "all") {
      filtered = filtered.filter((debt) => debt.classification === classificationFilter)
    }

    // Propensity filter
    if (propensityFilter !== "all") {
      filtered = filtered.filter((debt) => {
        const score = debt.propensity_payment_score
        switch (propensityFilter) {
          case "high":
            return score > 70
          case "medium":
            return score >= 40 && score <= 70
          case "low":
            return score < 40
          default:
            return true
        }
      })
    }

    // Amount filter
    if (amountFilter !== "all") {
      filtered = filtered.filter((debt) => {
        const amount = debt.amount
        switch (amountFilter) {
          case "small":
            return amount <= 1000
          case "medium":
            return amount > 1000 && amount <= 5000
          case "large":
            return amount > 5000
          default:
            return true
        }
      })
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case "due_date":
          aValue = new Date(a.due_date)
          bValue = new Date(b.due_date)
          break
        case "amount":
          aValue = a.amount
          bValue = b.amount
          break
        case "propensity_payment_score":
          aValue = a.propensity_payment_score
          bValue = b.propensity_payment_score
          break
        case "customer":
          aValue = a.customers.name
          bValue = b.customers.name
          break
        default:
          aValue = new Date(a.due_date)
          bValue = new Date(b.due_date)
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    onFilter(filtered)
    updateActiveFilters()
  }

  const updateActiveFilters = () => {
    const filters: string[] = []

    if (searchTerm) filters.push(`Busca: "${searchTerm}"`)
    if (statusFilter !== "all") {
      const statusLabels = {
        open: "Em Aberto",
        overdue: "Em Atraso",
        paid: "Pagas",
        in_collection: "Em Cobrança",
      }
      filters.push(`Status: ${statusLabels[statusFilter as keyof typeof statusLabels] || statusFilter}`)
    }
    if (classificationFilter !== "all") {
      const classLabels = {
        low: "Baixo",
        medium: "Médio",
        high: "Alto",
        critical: "Crítico",
      }
      filters.push(`Risco: ${classLabels[classificationFilter as keyof typeof classLabels] || classificationFilter}`)
    }
    if (propensityFilter !== "all") {
      const propLabels = {
        high: "Alta >70%",
        medium: "Média 40-70%",
        low: "Baixa <40%",
      }
      filters.push(`Propensão: ${propLabels[propensityFilter as keyof typeof propLabels] || propensityFilter}`)
    }
    if (amountFilter !== "all") {
      const amountLabels = {
        small: "Até R$ 1.000",
        medium: "R$ 1.000 - R$ 5.000",
        large: "Acima de R$ 5.000",
      }
      filters.push(`Valor: ${amountLabels[amountFilter as keyof typeof amountLabels] || amountFilter}`)
    }

    setActiveFilters(filters)
  }

  const removeFilter = (filterToRemove: string) => {
    if (filterToRemove.startsWith("Busca:")) {
      setSearchTerm("")
    } else if (filterToRemove.startsWith("Status:")) {
      setStatusFilter("all")
    } else if (filterToRemove.startsWith("Risco:")) {
      setClassificationFilter("all")
    } else if (filterToRemove.startsWith("Propensão:")) {
      setPropensityFilter("all")
    } else if (filterToRemove.startsWith("Valor:")) {
      setAmountFilter("all")
    }
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setClassificationFilter("all")
    setSortBy("due_date")
    setSortOrder("asc")
    setPropensityFilter("all")
    setAmountFilter("all")
    setActiveFilters([])
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  return (
    <div className="space-y-4">
      {/* Main Filters Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 lg:gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="open">Em Aberto</SelectItem>
              <SelectItem value="overdue">Em Atraso</SelectItem>
              <SelectItem value="paid">Pagas</SelectItem>
              <SelectItem value="in_collection">Em Cobrança</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">Data de Vencimento</SelectItem>
              <SelectItem value="amount">Valor</SelectItem>
              <SelectItem value="customer">Cliente</SelectItem>
              <SelectItem value="propensity_payment_score">Propensão</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleSortOrder}
            className="bg-transparent shrink-0"
            title={sortOrder === "asc" ? "Crescente" : "Decrescente"}
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`bg-transparent shrink-0 ${showAdvanced ? "bg-muted" : ""}`}
            title="Filtros avançados"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-4 border rounded-lg bg-muted/30 animate-in slide-in-from-top-2 duration-200">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros Avançados
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Classificação de Risco</label>
              <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as classificações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as classificações</SelectItem>
                  <SelectItem value="low">Baixo Risco</SelectItem>
                  <SelectItem value="medium">Médio Risco</SelectItem>
                  <SelectItem value="high">Alto Risco</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Propensão Mínima</label>
              <Select value={propensityFilter} onValueChange={setPropensityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer propensão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer propensão</SelectItem>
                  <SelectItem value="high">Alta &gt;70%</SelectItem>
                  <SelectItem value="medium">Média 40-70%</SelectItem>
                  <SelectItem value="low">Baixa &lt;40%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Valor da Dívida</label>
              <Select value={amountFilter} onValueChange={setAmountFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer valor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer valor</SelectItem>
                  <SelectItem value="small">Até R$ 1.000</SelectItem>
                  <SelectItem value="medium">R$ 1.000 - R$ 5.000</SelectItem>
                  <SelectItem value="large">Acima de R$ 5.000</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg animate-in fade-in duration-200">
          <span className="text-sm font-medium text-muted-foreground">Filtros ativos:</span>
          {activeFilters.map((filter, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 text-xs animate-in zoom-in duration-200"
            >
              {filter}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors"
                onClick={() => removeFilter(filter)}
              />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground ml-2 transition-colors"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar todos
          </Button>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        <span>
          Mostrando {debts.length} resultado{debts.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  )
}
