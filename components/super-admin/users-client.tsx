"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Users, Building2, Plus, Eye, Edit, UserCheck, ShieldCheck, MoreVertical, UserX, UserPlus, Trash2, AlertTriangle, Loader2 } from "lucide-react"
import { UserFilters } from "@/components/super-admin/user-filters"
import { useToast } from "@/hooks/use-toast"

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
  currentUserId?: string
}

// Simple Actions Menu Component with native dropdown
function UserActionsMenu({
  user,
  onSuspend,
  onDelete,
}: {
  user: User
  onSuspend: (action: "suspend" | "reactivate") => void
  onDelete: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
      >
        <span className="sr-only">Abrir menu</span>
        <MoreVertical className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
          style={{ zIndex: 9999 }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsOpen(false)
              onSuspend(user.status === "suspended" ? "reactivate" : "suspend")
            }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            {user.status === "suspended" ? (
              <>
                <UserPlus className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Reativar Usuário</span>
              </>
            ) : (
              <>
                <UserX className="h-4 w-4 text-orange-600" />
                <span className="text-orange-600">Suspender Usuário</span>
              </>
            )}
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsOpen(false)
              onDelete()
            }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Excluir Usuário
          </button>
        </div>
      )}
    </div>
  )
}

export function UsersClient({ initialUsers, companies, currentUserId }: UsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isFiltered, setIsFiltered] = useState(false)
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; user: User | null; action: "suspend" | "reactivate" }>({
    open: false,
    user: null,
    action: "suspend",
  })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  })
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const handleFiltersChange = (filters: {
    search: string
    role: string | null
    status: string | null
    companyId: string | null
  }) => {
    let filtered = [...users]

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (user) =>
          user.full_name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          (user.company_name && user.company_name.toLowerCase().includes(searchLower)),
      )
    }

    if (filters.role) {
      filtered = filtered.filter((user) => user.role === filters.role)
    }

    if (filters.status) {
      filtered = filtered.filter((user) => user.status === filters.status)
    }

    if (filters.companyId) {
      filtered = filtered.filter((user) => user.company_id === filters.companyId)
    }

    setFilteredUsers(filtered)
    setIsFiltered(filters.search !== "" || filters.role !== null || filters.status !== null || filters.companyId !== null)
  }

  const canModifyUser = (user: User): boolean => {
    // Cannot modify super admins
    if (user.role === "super_admin") return false
    // Cannot modify yourself
    if (user.id === currentUserId) return false
    return true
  }

  const handleSuspendClick = (user: User, action: "suspend" | "reactivate") => {
    setSuspendDialog({ open: true, user, action })
  }

  const handleDeleteClick = (user: User) => {
    setDeleteDialog({ open: true, user })
    setDeleteConfirmText("")
  }

  const handleSuspendConfirm = async () => {
    if (!suspendDialog.user) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/super-admin/users/${suspendDialog.user.id}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: suspendDialog.action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar solicitação")
      }

      // Update local state
      setUsers(prev =>
        prev.map(u =>
          u.id === suspendDialog.user!.id
            ? { ...u, status: suspendDialog.action === "suspend" ? "suspended" : "active" }
            : u
        )
      )

      toast({
        title: suspendDialog.action === "suspend" ? "Usuário suspenso" : "Usuário reativado",
        description: `${suspendDialog.user.full_name} foi ${suspendDialog.action === "suspend" ? "suspenso" : "reativado"} com sucesso.`,
      })

      setSuspendDialog({ open: false, user: null, action: "suspend" })
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.user || deleteConfirmText !== "EXCLUIR") return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/super-admin/users/${deleteDialog.user.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir usuário")
      }

      // Remove from local state
      setUsers(prev => prev.filter(u => u.id !== deleteDialog.user!.id))

      toast({
        title: "Usuário excluído",
        description: `${deleteDialog.user.full_name} foi excluído permanentemente.`,
      })

      setDeleteDialog({ open: false, user: null })
      setDeleteConfirmText("")
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const displayUsers = isFiltered ? filteredUsers : users
  const companiesWithUsers = new Set(users.filter(u => u.company_id).map(u => u.company_id)).size

  const totalStats = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    superAdmins: users.filter((u) => u.role === "super_admin").length,
    admins: users.filter((u) => u.role === "admin").length,
    regularUsers: users.filter((u) => u.role === "user").length,
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
              ? `${displayUsers.length} usuários encontrados (de ${users.length} total)`
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
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
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
                                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
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

                    <div className="flex space-x-2 items-center">
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

                      {/* Native Actions Menu */}
                      {canModifyUser(user) && (
                        <UserActionsMenu
                          user={user}
                          onSuspend={(action) => handleSuspendClick(user, action)}
                          onDelete={() => handleDeleteClick(user)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suspend/Reactivate Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => !isProcessing && setSuspendDialog({ ...suspendDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {suspendDialog.action === "suspend" ? "Suspender Usuário" : "Reativar Usuário"}
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                {suspendDialog.action === "suspend" ? (
                  <>
                    <p>Tem certeza que deseja suspender o acesso de:</p>
                    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="font-medium">{suspendDialog.user?.full_name}</p>
                      <p className="text-sm text-gray-500">{suspendDialog.user?.email}</p>
                      {suspendDialog.user?.company_name && (
                        <p className="text-sm text-gray-500">{suspendDialog.user.company_name}</p>
                      )}
                    </div>
                    <p className="mt-3">O usuário não poderá acessar a plataforma até ser reativado.</p>
                  </>
                ) : (
                  <>
                    <p>Tem certeza que deseja reativar o acesso de:</p>
                    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="font-medium">{suspendDialog.user?.full_name}</p>
                      <p className="text-sm text-gray-500">{suspendDialog.user?.email}</p>
                      {suspendDialog.user?.company_name && (
                        <p className="text-sm text-gray-500">{suspendDialog.user.company_name}</p>
                      )}
                    </div>
                    <p className="mt-3">O usuário poderá acessar a plataforma normalmente.</p>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, user: null, action: "suspend" })} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button
              variant={suspendDialog.action === "suspend" ? "destructive" : "default"}
              onClick={handleSuspendConfirm}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {suspendDialog.action === "suspend" ? "Suspender Acesso" : "Reativar Acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !isProcessing && setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Excluir Usuário
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                <p className="font-semibold text-red-600">Esta ação é IRREVERSÍVEL.</p>
                <p className="mt-2">O usuário será permanentemente removido da plataforma:</p>
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="font-medium text-red-800 dark:text-red-300">{deleteDialog.user?.full_name}</p>
                  <p className="text-sm text-red-600 dark:text-red-400">{deleteDialog.user?.email}</p>
                  {deleteDialog.user?.company_name && (
                    <p className="text-sm text-red-600 dark:text-red-400">{deleteDialog.user.company_name}</p>
                  )}
                </div>
                <p className="mt-4">Digite <span className="font-mono font-bold">EXCLUIR</span> para confirmar:</p>
                <Input
                  className="mt-2"
                  placeholder="Digite EXCLUIR"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialog({ open: false, user: null })
                setDeleteConfirmText("")
              }}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmText !== "EXCLUIR" || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
