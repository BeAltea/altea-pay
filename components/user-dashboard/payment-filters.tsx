"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, Filter, X, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

export function PaymentFilters() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [methodFilter, setMethodFilter] = useState("all")
  const [sortBy, setSortBy] = useState("payment_date")
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const handleFilterChange = (filterType: string, value: string) => {
    const filterLabel = `${filterType}: ${value}`

    if (filterType === "status") {
      setStatusFilter(value)
      if (value !== "all" && !activeFilters.includes(filterLabel)) {
        setActiveFilters([...activeFilters.filter((f) => !f.startsWith("status:")), filterLabel])
      }
    } else if (filterType === "method") {
      setMethodFilter(value)
      if (value !== "all" && !activeFilters.includes(filterLabel)) {
        setActiveFilters([...activeFilters.filter((f) => !f.startsWith("method:")), filterLabel])
      }
    }
  }

  const removeFilter = (filterToRemove: string) => {
    setActiveFilters(activeFilters.filter((filter) => filter !== filterToRemove))
    if (filterToRemove.startsWith("status:")) {
      setStatusFilter("all")
    } else if (filterToRemove.startsWith("method:")) {
      setMethodFilter("all")
    }
  }

  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setMethodFilter("all")
    setSortBy("payment_date")
    setDateFrom(undefined)
    setDateTo(undefined)
    setActiveFilters([])
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição ou ID da transação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(value) => handleFilterChange("status", value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={methodFilter} onValueChange={(value) => handleFilterChange("method", value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Métodos</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="boleto">Boleto</SelectItem>
            <SelectItem value="cartao">Cartão</SelectItem>
            <SelectItem value="transferencia">Transferência</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="payment_date">Data do Pagamento</SelectItem>
            <SelectItem value="amount">Valor</SelectItem>
            <SelectItem value="created_at">Data de Criação</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[240px] justify-start text-left font-normal",
                  !dateFrom && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "PPP", { locale: ptBR }) : "Data inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[240px] justify-start text-left font-normal",
                  !dateTo && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "PPP", { locale: ptBR }) : "Data final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Active Filters */}
      {(activeFilters.length > 0 || dateFrom || dateTo) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {filter}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeFilter(filter)} />
            </Badge>
          ))}
          {dateFrom && (
            <Badge variant="secondary" className="flex items-center gap-1">
              De: {format(dateFrom, "dd/MM/yyyy")}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setDateFrom(undefined)} />
            </Badge>
          )}
          {dateTo && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Até: {format(dateTo, "dd/MM/yyyy")}
              <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => setDateTo(undefined)} />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Limpar todos
          </Button>
        </div>
      )}
    </div>
  )
}
