"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Users, Shield, Building2, Plus, Eye, Edit, UserCheck, ShieldCheck } from "lucide-react"
import { UserFilters } from "@/components/super-admin/user-filters"

interface User {
  id: string
  email: string
  full_name: string
  role: "super_admin" | "admin" | "user"
  company_name?: string
  company_id?: string
  status: "active" | "inactive" | "suspended"
  last_login?: string
  created_at: string
}

interface Company {
  id: string
  name: string
}

interface UsersClientProps {
  initialUsers: User[]
  companies: Company[]
}

export function UsersClient({ initialUsers, companies }: UsersClientProps) {
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isFiltered, setIsFiltered] = useState(false)

  const handleFiltersChange = (filters: {
    search: string
    role: string | null
    status: string | null
    companyId: string | null
  }) => {
    let filtered = [...initialUsers]

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.full_name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          (user.company_name && user.company_name.toLowerCase().includes(searchLower)),
      )
    }

    // Apply role filter
    if (filters.role) {
      filtered = filtered.filter((user) => user.role === filters.role)
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter((user) => user.status === filters.status)
    }

    // Apply company filter
    if (filters.companyId) {
      filtered = filtered.filter((user) => user.company_id === filters.companyId)
    }

    setFilteredUsers(filtered)
    setIsFiltered(filters.search !== "" || filters.role !== null || filters.status !== null || filters.companyId !== null)
  }

  const displayUsers = isFiltered ? filteredUsers : initialUsers

  // Calculate unique companies with users
  const companiesWithUsers = new Set(initialUsers.filter(u => u.company_id).map(u => u.company_id)).size

  const totalStats = {
    totalUsers: initialUsers.length,
    activeUsers: initialUsers.filter((u) => u.status === "active").length,
    superAdmins: initialUsers.filter((u) => u.role === "super_admin").length,
    admins: initialUsers.filter((u) => u.role === "admin").length,
    regularUsers: initialUsers.filter((u) => u.role === "user").length,
    companiesWithAccess: companiesWithUsers,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Usuários & Acessos</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Gerencie os usuários e permissões de acesso à plataforma.
          </p>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/super-admin/users/new">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Novo Usuário</span>
              <span className="sm:hidden">Novo</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">{totalStats.activeUsers} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas com Acesso</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.companiesWithAccess}</div>
            <p className="text-xs text-muted-foreground">Com usuários ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.superAdmins}</div>
            <p className="text-xs text-muted-foreground">Acesso total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.admins}</div>
            <p className="text-xs text-muted-foreground">Por empresa</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <UserFilters onFiltersChange={handleFiltersChange} companies={companies} />

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            {isFiltered
              ? `${displayUsers.length} usuários encontrados (de ${initialUsers.length} total)`
              : "Lista completa de todos os usuários cadastrados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum usuário encontrado</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Tente ajustar os filtros para encontrar os usuários desejados.
                </p>
              </div>
            ) : (
              displayUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-4 mb-3 lg:mb-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={`/generic-placeholder-icon.png`} alt={user.full_name} />
                        <AvatarFallback className="bg-altea-gold/10 text-altea-navy">
                          {user.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">{user.full_name}</h3>
                          <Badge
                            className={
                              user.role === "super_admin"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
                                : user.role === "admin"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                            }
                          >
                            {user.role === "super_admin"
                              ? "Super Admin"
                              : user.role === "admin"
                                ? "Administrador"
                                : "Usuário"}
                          </Badge>
                          <Badge
                            className={
                              user.status === "active"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                                : user.status === "suspended"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                            }
                          >
                            {user.status === "active" ? "Ativo" : user.status === "suspended" ? "Suspenso" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{user.email}</span>
                          {user.company_name && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <div className="flex items-center space-x-1">
                                <Building2 className="h-3 w-3" />
                                <span>{user.company_name}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6 mt-4 lg:mt-0">
                    <div className="grid grid-cols-2 sm:flex sm:space-x-6 gap-4 sm:gap-0">
                      <div className="text-center sm:text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Criado em</p>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/super-admin/users/${user.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/super-admin/users/${user.id}/edit`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
