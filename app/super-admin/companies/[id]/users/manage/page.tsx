"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"
import { Users, ArrowLeft, Plus, Trash2, UserCheck, UserX, Search } from "lucide-react"

interface CompanyUser {
  id: string
  name: string
  email: string
  role: string
  status: "active" | "inactive" | "suspended"
  lastLogin: string
  createdAt: string
}

export default function ManageUsersPage({ params }: { params: { id: string } }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "operator",
  })

  const companyName = "Enel Distribuição São Paulo"

  const [users, setUsers] = useState<CompanyUser[]>([
    {
      id: "1",
      name: "João Silva",
      email: "joao.silva@enel.com.br",
      role: "admin",
      status: "active",
      lastLogin: "2024-03-15T14:30:00Z",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria.santos@enel.com.br",
      role: "operator",
      status: "active",
      lastLogin: "2024-03-14T09:15:00Z",
      createdAt: "2024-02-01T14:30:00Z",
    },
    {
      id: "3",
      name: "Pedro Costa",
      email: "pedro.costa@enel.com.br",
      role: "supervisor",
      status: "inactive",
      lastLogin: "2024-03-10T16:45:00Z",
      createdAt: "2024-01-20T11:15:00Z",
    },
    {
      id: "4",
      name: "Ana Oliveira",
      email: "ana.oliveira@enel.com.br",
      role: "operator",
      status: "suspended",
      lastLogin: "2024-03-05T08:20:00Z",
      createdAt: "2024-02-15T16:00:00Z",
    },
  ])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    const matchesRole = roleFilter === "all" || user.role === roleFilter

    return matchesSearch && matchesStatus && matchesRole
  })

  const handleAddUser = () => {
    console.log("[v0] Adicionando novo usuário:", newUser)

    const user: CompanyUser = {
      id: Date.now().toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: "active",
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    setUsers((prev) => [...prev, user])
    setNewUser({ name: "", email: "", role: "operator" })
    setIsAddUserOpen(false)
    alert("Usuário adicionado com sucesso!")
  }

  const handleStatusChange = (userId: string, newStatus: "active" | "inactive" | "suspended") => {
    console.log("[v0] Alterando status do usuário:", userId, "para:", newStatus)

    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, status: newStatus } : user)))
    alert(`Status do usuário alterado para ${newStatus}!`)
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      console.log("[v0] Excluindo usuário:", userId)
      setUsers((prev) => prev.filter((user) => user.id !== userId))
      alert("Usuário excluído com sucesso!")
    }
  }

  const getRoleLabel = (role: string) => {
    const roles = {
      admin: "Administrador",
      supervisor: "Supervisor",
      operator: "Operador",
      viewer: "Visualizador",
    }
    return roles[role as keyof typeof roles] || role
  }

  const getStatusLabel = (status: string) => {
    const statuses = {
      active: "Ativo",
      inactive: "Inativo",
      suspended: "Suspenso",
    }
    return statuses[status as keyof typeof statuses] || status
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Usuários</h1>
          <p className="text-gray-600 dark:text-gray-400">{companyName}</p>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild variant="outline">
            <Link href={`/super-admin/companies/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                <DialogDescription>Adicione um novo usuário para esta empresa</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userName">Nome Completo</Label>
                  <Input
                    id="userName"
                    value={newUser.name}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Digite o nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Digite o email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userRole">Função</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                      <SelectItem value="operator">Operador</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddUser} disabled={!newUser.name || !newUser.email}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Funções</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Usuários ({filteredUsers.length})</span>
          </CardTitle>
          <CardDescription>Gerencie os usuários que têm acesso ao sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={`/.jpg?height=40&width=40&query=${user.name}`} />
                    <AvatarFallback>
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="font-medium">{user.name}</p>
                      <Badge
                        variant={
                          user.status === "active"
                            ? "default"
                            : user.status === "suspended"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {getStatusLabel(user.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span>Função: {getRoleLabel(user.role)}</span>
                      <span>•</span>
                      <span>Último login: {new Date(user.lastLogin).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {user.status === "active" ? (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(user.id, "inactive")}>
                      <UserX className="h-4 w-4 mr-1" />
                      Desativar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(user.id, "active")}>
                      <UserCheck className="h-4 w-4 mr-1" />
                      Ativar
                    </Button>
                  )}

                  {user.status !== "suspended" && (
                    <Button size="sm" variant="outline" onClick={() => handleStatusChange(user.id, "suspended")}>
                      Suspender
                    </Button>
                  )}

                  <Button size="sm" variant="outline" onClick={() => handleDeleteUser(user.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum usuário encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
