"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter } from "lucide-react"

interface UserFiltersProps {
  onFiltersChange: (filters: {
    search: string
    role: string | null
    status: string | null
  }) => void
}

export function UserFilters({ onFiltersChange }: UserFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFiltersChange({
        search: searchTerm,
        role: roleFilter,
        status: statusFilter,
      })
    }, 300) // Debounce de 300ms

    return () => clearTimeout(timeoutId)
  }, [searchTerm, roleFilter, statusFilter, onFiltersChange])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    console.log("[v0] Pesquisando usuários por:", value)
    setSearchTerm(value)
  }

  const handleRoleFilter = (value: string) => {
    const role = value === "all" ? null : value
    console.log("[v0] Filtro de função alterado para:", role)
    setRoleFilter(role)
  }

  const handleStatusFilter = (value: string) => {
    const status = value === "all" ? null : value
    console.log("[v0] Filtro de status alterado para:", status)
    setStatusFilter(status)
  }

  const clearFilters = () => {
    console.log("[v0] Limpando todos os filtros")
    setSearchTerm("")
    setRoleFilter(null)
    setStatusFilter(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, email ou empresa..."
              className="pl-10"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={roleFilter || "all"} onValueChange={handleRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Funções</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter || "all"} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || roleFilter || statusFilter) && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
