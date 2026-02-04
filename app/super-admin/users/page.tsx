"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { Users, Shield, Building2, Plus, Eye, Edit, UserCheck, UserX, Clock, Loader2, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { UserFilters } from "@/components/super-admin/user-filters"

interface User {
  id: string
  email: string
  fullName: string
  role: "super_admin" | "admin" | "user"
  companyName?: string
  companyId?: string
  status: "active" | "inactive" | "suspended"
  lastLogin: string
  createdAt: string
  totalLogins: number
}

export default function UsersPage() {
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isFiltered, setIsFiltered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/super-admin/users")

        if (!response.ok) {
          throw new Error("Failed to fetch users")
        }

        const users = await response.json()

        console.log("[v0] Total de usuarios carregados:", users?.length || 0)
        setAllUsers(users)
        console.log("[v0] Usuarios carregados com sucesso:", users.length)
      } catch (error) {
        console.error("[v0] Erro ao carregar usuarios:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleFiltersChange = (filters: {
    search: string
    role: string | null
    status: string | null
  }) => {
    console.log("[v0] Aplicando filtros:", filters)

    let filtered = [...allUsers]

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.fullName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          (user.companyName && user.companyName.toLowerCase().includes(searchLower)),
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

    console.log("[v0] Usuarios filtrados:", filtered.length, "de", allUsers.length)
    setFilteredUsers(filtered)
    setIsFiltered(filters.search !== "" || filters.role !== null || filters.status !== null)
  }

  const handleDeleteUser = async (userId: string) => {
    setDeletingUserId(userId)
    try {
      const response = await fetch(`/api/super-admin/users/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || "Erro ao excluir usuario")
        return
      }

      // Remove user from state
      setAllUsers((prev) => prev.filter((u) => u.id !== userId))
      setFilteredUsers((prev) => prev.filter((u) => u.id !== userId))
      console.log("[v0] Usuario excluido com sucesso:", userId)
    } catch (error) {
      console.error("[v0] Erro ao excluir usuario:", error)
      alert("Erro ao excluir usuario")
    } finally {
      setDeletingUserId(null)
    }
  }

  const displayUsers = isFiltered ? filteredUsers : allUsers

  const totalStats = {
    totalUsers: allUsers.length,
    activeUsers: allUsers.filter((u) => u.status === "active").length,
    superAdmins: allUsers.filter((u) => u.role === "super_admin").length,
    admins: allUsers.filter((u) => u.role === "admin").length,
    regularUsers: allUsers.filter((u) => u.role === "user").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gerenciamento de Usuarios</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Gerencie todos os usuarios do sistema Altea Pay.
          </p>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/super-admin/users/new">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Novo Usuario</span>
              <span className="sm:hidden">Novo</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
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
            <CardTitle className="text-sm font-medium">Usuarios Regulares</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.regularUsers}</div>
            <p className="text-xs text-muted-foreground">Acesso limitado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Ativos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Ultimos 30 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <UserFilters onFiltersChange={handleFiltersChange} />

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios do Sistema</CardTitle>
          <CardDescription>
            {isFiltered
              ? `${displayUsers.length} usuarios encontrados (de ${allUsers.length} total)`
              : "Lista completa de todos os usuarios cadastrados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum usuario encontrado</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Tente ajustar os filtros para encontrar os usuarios desejados.
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
                        <AvatarImage src={`/generic-placeholder-icon.png`} alt={user.fullName} />
                        <AvatarFallback className="bg-altea-gold/10 text-altea-navy">
                          {user.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">{user.fullName}</h3>
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
                                : "Usuario"}
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
                          {user.companyName && (
                            <>
                              <span className="hidden sm:inline">-</span>
                              <div className="flex items-center space-x-1">
                                <Building2 className="h-3 w-3" />
                                <span>{user.companyName}</span>
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
                          {new Date(user.createdAt).toLocaleDateString("pt-BR")}
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            disabled={deletingUserId === user.id}
                          >
                            {deletingUserId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Usuario</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o usuario <strong>{user.fullName}</strong> ({user.email})?
                              <br /><br />
                              Esta acao nao pode ser desfeita. Todos os dados associados a este usuario serao permanentemente removidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
