import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Users, UserCheck, UserX, AlertTriangle } from "lucide-react"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"

export default async function ManageUsersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single()

  if (companyError || !company) {
    notFound()
  }

  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", id)
    .order("created_at", { ascending: false })

  const usersList = (users || []).map((user) => ({
    id: user.id,
    name: user.full_name || user.email?.split("@")[0] || "Sem nome",
    email: user.email || "N/A",
    document: user.document || "N/A",
    phone: user.phone || "-",
    role: user.role === "admin" ? "Administrador" : user.role === "user" ? "Usuário" : "Visualizador",
    status: (user.status || "active") as "ativo" | "inativo" | "suspenso",
    lastLogin: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("pt-BR") : "-",
    createdAt: user.created_at,
    accessLevel: user.role === "admin" ? "critico" : user.role === "user" ? "medio" : "baixo",
  }))

  const totalUsers = usersList.length
  const activeUsers = usersList.filter((u) => u.status === "ativo").length
  const inactiveUsers = usersList.filter((u) => u.status === "inativo").length
  const suspendedUsers = usersList.filter((u) => u.status === "suspenso").length
  const criticalAccess = usersList.filter((u) => u.accessLevel === "critico").length
  const highAccess = usersList.filter((u) => u.accessLevel === "alto").length
  const mediumAccess = usersList.filter((u) => u.accessLevel === "medio").length
  const lowAccess = usersList.filter((u) => u.accessLevel === "baixo").length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Ativo</Badge>
      case "inativo":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">Inativo</Badge>
      case "suspenso":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">Suspenso</Badge>
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            {status}
          </Badge>
        )
    }
  }

  const getAccessBadge = (level: string) => {
    switch (level) {
      case "critico":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 text-xs">Crítico</Badge>
      case "alto":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs">Alto</Badge>
      case "medio":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs">Médio</Badge>
      case "baixo":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Baixo</Badge>
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            {level}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
          <Link href={`/super-admin/companies/${id}`}>
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
          {company.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm lg:text-base">
          Gestão de usuários do sistema • CNPJ: {company.cnpj || "N/A"}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Total de Usuários
                </p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
                <p className="text-xs text-gray-500 mt-1">Usuários cadastrados</p>
              </div>
              <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Usuários Ativos</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">{activeUsers}</p>
                <p className="text-xs text-gray-500 mt-1">Com acesso ativo</p>
              </div>
              <UserCheck className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Usuários Inativos
                </p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600">{inactiveUsers}</p>
                <p className="text-xs text-gray-500 mt-1">Sem acesso ao sistema</p>
              </div>
              <UserX className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Suspensos</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-600">{suspendedUsers}</p>
                <p className="text-xs text-gray-500 mt-1">Acesso temporariamente bloqueado</p>
              </div>
              <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-3 sm:p-4 lg:p-6 border-b">
            <h3 className="text-base sm:text-lg font-semibold">Usuários do Sistema - {company.name}</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Lista completa de usuários com acesso ao sistema
            </p>
          </div>

          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {usersList.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum usuário cadastrado</p>
                <p className="text-sm text-gray-400 mt-2">Adicione usuários para começar</p>
              </div>
            ) : (
              usersList.map((user) => (
                <Card key={user.id} className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">
                            {user.name}
                          </h4>
                          {getStatusBadge(user.status)}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">{user.email}</p>
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">CPF: {user.document}</p>
                        <p className="text-xs sm:text-sm text-gray-500 mb-2">
                          {user.phone !== "-" ? user.phone : "Telefone não informado"}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                          {getAccessBadge(user.accessLevel)}
                        </div>

                        <p className="text-xs text-gray-500">
                          Último login: {user.lastLogin !== "-" ? user.lastLogin : "Nunca"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
