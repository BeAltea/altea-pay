"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter } from "lucide-react"

interface Company {
  id: string
  name: string
}

interface UserFiltersProps {
  onFiltersChange: (filters: {
    search: string
    role: string | null
    status: string | null
    companyId: string | null
  }) => void
  companies?: Company[]
}

export function UserFilters({ onFiltersChange, companies = [] }: UserFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [companyFilter, setCompanyFilter] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFiltersChange({
        search: searchTerm,
        role: roleFilter,
        status: statusFilter,
        companyId: companyFilter,
      })
    }, 300)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, roleFilter, statusFilter, companyFilter])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
  }

  const handleRoleFilter = (value: string) => {
    const role = value === "all" ? null : value
    setRoleFilter(role)
  }

  const handleStatusFilter = (value: string) => {
    const status = value === "all" ? null : value
    setStatusFilter(status)
  }

  const handleCompanyFilter = (value: string) => {
    const companyId = value === "all" ? null : value
    setCompanyFilter(companyId)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setRoleFilter(null)
    setStatusFilter(null)
    setCompanyFilter(null)
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
            {companies.length > 0 && (
              <Select value={companyFilter || "all"} onValueChange={handleCompanyFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Empresas</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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

            {(searchTerm || roleFilter || statusFilter || companyFilter) && (
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
