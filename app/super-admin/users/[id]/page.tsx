import { createClient as createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  User,
  Mail,
  Building2,
  Calendar,
  Clock,
  Shield,
  Edit,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogIn,
} from "lucide-react"
import { UserDetailActions } from "@/components/super-admin/user-detail-actions"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface UserDetails {
  id: string
  email: string
  full_name: string
  role: "super_admin" | "admin" | "user"
  company_name?: string
  company_id?: string
  status: "active" | "inactive" | "suspended"
  last_sign_in_at?: string
  created_at: string
  phone?: string
  permissions: string[]
}

async function fetchUserDetails(userId: string): Promise<{ user: UserDetails | null; currentUserId: string | null }> {
  const supabase = createAdminClient()
  const authSupabase = await createServerClient()

  // Get current user
  const { data: { user: currentUser } } = await authSupabase.auth.getUser()

  // Fetch profile from database
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      role,
      company_id,
      phone,
      created_at,
      companies (
        name
      )
    `)
    .eq("id", userId)
    .single()

  if (profileError || !profile) {
    console.error("[UserDetail] Profile not found:", profileError)
    return { user: null, currentUserId: currentUser?.id || null }
  }

  // Fetch auth user data for login info
  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId)

  if (authError) {
    console.error("[UserDetail] Auth user fetch error:", authError)
  }

  const authUser = authData?.user

  // Determine status based on ban status
  let status: "active" | "inactive" | "suspended" = "active"
  if (authUser?.banned_until && new Date(authUser.banned_until) > new Date()) {
    status = "suspended"
  } else if (!authUser?.last_sign_in_at) {
    status = "inactive"
  }

  // Derive permissions from role
  const permissionsByRole: Record<string, string[]> = {
    super_admin: ["view_dashboard", "manage_all_companies", "manage_users", "view_reports", "system_settings"],
    admin: ["view_dashboard", "manage_company", "view_reports", "export_data"],
    user: ["view_dashboard", "view_own_data"],
  }

  const userDetails: UserDetails = {
    id: profile.id,
    email: profile.email || authUser?.email || "",
    full_name: profile.full_name || "Sem nome",
    role: profile.role || "user",
    company_name: (profile.companies as any)?.name,
    company_id: profile.company_id,
    status,
    last_sign_in_at: authUser?.last_sign_in_at || undefined,
    created_at: profile.created_at || authUser?.created_at || new Date().toISOString(),
    phone: profile.phone,
    permissions: permissionsByRole[profile.role] || permissionsByRole.user,
  }

  return { user: userDetails, currentUserId: currentUser?.id || null }
}

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user: userDetails, currentUserId } = await fetchUserDetails(id)

  if (!userDetails) {
    notFound()
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
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
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

  const formatPermission = (permission: string) => {
    const labels: Record<string, string> = {
      view_dashboard: "Ver Dashboard",
      manage_all_companies: "Gerenciar Todas Empresas",
      manage_users: "Gerenciar Usuários",
      view_reports: "Ver Relatórios",
      system_settings: "Configurações do Sistema",
      manage_company: "Gerenciar Empresa",
      export_data: "Exportar Dados",
      view_own_data: "Ver Próprios Dados",
    }
    return labels[permission] || permission.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(userDetails.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  const canModifyUser = userDetails.role !== "super_admin" && userDetails.id !== currentUserId

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/super-admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={`/generic-placeholder-icon.png`} alt={userDetails.full_name} />
              <AvatarFallback className="bg-altea-gold/10 text-altea-navy">
                {userDetails.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{userDetails.full_name}</h1>
                <Badge className={getRoleColor(userDetails.role)}>{getRoleLabel(userDetails.role)}</Badge>
                <Badge className={getStatusColor(userDetails.status)}>{getStatusLabel(userDetails.status)}</Badge>
              </div>
              <p className="text-gray-600 dark:text-gray-400">{userDetails.email}</p>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button asChild variant="outline">
            <Link href={`/super-admin/users/${userDetails.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Acesso</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {userDetails.last_sign_in_at ? (
              <>
                <div className="text-2xl font-bold">
                  {new Date(userDetails.last_sign_in_at).toLocaleDateString("pt-BR")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(userDetails.last_sign_in_at).toLocaleTimeString("pt-BR")}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-400">—</div>
                <p className="text-xs text-muted-foreground">Nunca acessou</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissões</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userDetails.permissions.length}</div>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Cadastro</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{daysSinceCreation} dias</div>
            <p className="text-xs text-muted-foreground">
              Desde {new Date(userDetails.created_at).toLocaleDateString("pt-BR")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status da Conta</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {userDetails.status === "active" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : userDetails.status === "suspended" ? (
                <XCircle className="h-5 w-5 text-orange-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-gray-400" />
              )}
              <span className="text-lg font-semibold">{getStatusLabel(userDetails.status)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {userDetails.status === "active"
                ? "Acesso liberado"
                : userDetails.status === "suspended"
                  ? "Acesso bloqueado"
                  : "Aguardando primeiro acesso"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* User Information */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Informações do Usuário</CardTitle>
            <CardDescription>Dados pessoais e profissionais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Nome Completo</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{userDetails.full_name}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{userDetails.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Telefone</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {userDetails.phone || "Não informado"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Empresa</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {userDetails.company_name || "Nenhuma empresa vinculada"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Função</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{getRoleLabel(userDetails.role)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Data de Cadastro</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(userDetails.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Permissões</h4>
              <div className="flex flex-wrap gap-2">
                {userDetails.permissions.map((permission) => (
                  <Badge key={permission} variant="outline" className="text-xs">
                    {formatPermission(permission)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status and Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Gerenciar este usuário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Display */}
            <div
              className={`rounded-lg p-4 ${
                userDetails.status === "active"
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : userDetails.status === "suspended"
                    ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                    : "bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                {userDetails.status === "active" ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : userDetails.status === "suspended" ? (
                  <XCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      userDetails.status === "active"
                        ? "text-green-900 dark:text-green-100"
                        : userDetails.status === "suspended"
                          ? "text-orange-900 dark:text-orange-100"
                          : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {userDetails.status === "active"
                      ? "Usuário Ativo"
                      : userDetails.status === "suspended"
                        ? "Usuário Suspenso"
                        : "Usuário Inativo"}
                  </p>
                  <p
                    className={`text-sm ${
                      userDetails.status === "active"
                        ? "text-green-700 dark:text-green-300"
                        : userDetails.status === "suspended"
                          ? "text-orange-700 dark:text-orange-300"
                          : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {userDetails.status === "active"
                      ? "Acesso permitido"
                      : userDetails.status === "suspended"
                        ? "Acesso bloqueado"
                        : "Nunca acessou"}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t space-y-2">
              <Button asChild className="w-full" variant="outline">
                <Link href={`/super-admin/users/${userDetails.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Usuário
                </Link>
              </Button>

              {userDetails.company_id && (
                <Button asChild className="w-full" variant="outline">
                  <Link href={`/super-admin/companies/${userDetails.company_id}`}>
                    <Building2 className="mr-2 h-4 w-4" />
                    Ver Empresa
                  </Link>
                </Button>
              )}

              {/* Suspend/Delete Actions */}
              {canModifyUser && (
                <UserDetailActions
                  userId={userDetails.id}
                  userName={userDetails.full_name}
                  userEmail={userDetails.email}
                  companyName={userDetails.company_name}
                  currentStatus={userDetails.status}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
