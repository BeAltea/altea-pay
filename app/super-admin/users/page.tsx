import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Users, Shield, Building2, Plus, Eye, Edit, UserCheck, UserX, Clock } from "lucide-react"
import { UserFilters } from "@/components/super-admin/user-filters"

interface User {
  id: string
  email: string
  full_name: string
  role: "super_admin" | "admin" | "user"
  company_name?: string
  company_id?: string
  status: "active" | "inactive" | "suspended"
  last_login: string
  created_at: string
  total_logins: number
}

export default async function UsersPage() {
  const supabase = await createClient()

  // Mock data for users
  const users: User[] = [
    {
      id: "1",
      email: "super@alteapay.com",
      full_name: "Super Administrador",
      role: "super_admin",
      status: "active",
      last_login: "2024-03-15T14:30:00Z",
      created_at: "2024-01-01T00:00:00Z",
      total_logins: 245,
    },
    {
      id: "2",
      email: "admin@enel.com.br",
      full_name: "Maria Santos",
      role: "admin",
      company_name: "Enel Distribuição São Paulo",
      company_id: "11111111-1111-1111-1111-111111111111",
      status: "active",
      last_login: "2024-03-15T10:15:00Z",
      created_at: "2024-01-15T10:00:00Z",
      total_logins: 89,
    },
    {
      id: "3",
      email: "joao.silva@enel.com.br",
      full_name: "João Silva",
      role: "user",
      company_name: "Enel Distribuição São Paulo",
      company_id: "11111111-1111-1111-1111-111111111111",
      status: "active",
      last_login: "2024-03-14T16:45:00Z",
      created_at: "2024-01-20T14:30:00Z",
      total_logins: 156,
    },
    {
      id: "4",
      email: "admin@sabesp.com.br",
      full_name: "Carlos Oliveira",
      role: "admin",
      company_name: "Sabesp - Companhia de Saneamento",
      company_id: "22222222-2222-2222-2222-222222222222",
      status: "active",
      last_login: "2024-03-15T09:30:00Z",
      created_at: "2024-02-20T14:30:00Z",
      total_logins: 67,
    },
    {
      id: "5",
      email: "ana.costa@sabesp.com.br",
      full_name: "Ana Costa",
      role: "user",
      company_name: "Sabesp - Companhia de Saneamento",
      company_id: "22222222-2222-2222-2222-222222222222",
      status: "inactive",
      last_login: "2024-03-10T11:20:00Z",
      created_at: "2024-02-25T09:15:00Z",
      total_logins: 23,
    },
    {
      id: "6",
      email: "admin@cpfl.com.br",
      full_name: "Roberto Lima",
      role: "admin",
      company_name: "CPFL Energia",
      company_id: "33333333-3333-3333-3333-333333333333",
      status: "suspended",
      last_login: "2024-03-05T15:10:00Z",
      created_at: "2024-03-10T09:15:00Z",
      total_logins: 12,
    },
  ]

  const totalStats = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    superAdmins: users.filter((u) => u.role === "super_admin").length,
    admins: users.filter((u) => u.role === "admin").length,
    regularUsers: users.filter((u) => u.role === "user").length,
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
      case "user":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "super_admin":
        return "Super Admin"
      case "admin":
        return "Administrador"
      case "user":
        return "Usuário"
      default:
        return "Usuário"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
      case "suspended":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo"
      case "inactive":
        return "Inativo"
      case "suspended":
        return "Suspenso"
      default:
        return "Inativo"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gerenciamento de Usuários</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Gerencie todos os usuários do sistema Altea Pay.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-6">
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
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Regulares</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.regularUsers}</div>
            <p className="text-xs text-muted-foreground">Acesso limitado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <UserFilters />

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>Lista completa de todos os usuários cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-4 mb-3 lg:mb-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={`/placeholder-svg-key-user-.jpg?key=user-${user.id}&height=48&width=48&query=${user.full_name}`}
                      />
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
                        <Badge className={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                        <Badge className={getStatusColor(user.status)}>{getStatusLabel(user.status)}</Badge>
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
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.total_logins}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Logins</p>
                    </div>

                    <div className="text-center sm:text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(user.last_login).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Último acesso</p>
                    </div>

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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
