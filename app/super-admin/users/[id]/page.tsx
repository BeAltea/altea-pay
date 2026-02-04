import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { profiles, companies } from "@/lib/db/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  ArrowLeft,
  User,
  Mail,
  Building2,
  Calendar,
  Clock,
  Shield,
  Edit,
  Settings,
  CheckCircle,
  AlertTriangle,
  Activity,
  LogIn,
} from "lucide-react"

interface UserDetails {
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
  phone?: string
  department?: string
  permissions: string[]
}

interface LoginHistory {
  id: number
  timestamp: string
  ipAddress: string
  userAgent: string
  location: string
  status: "success" | "failed"
}

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const user = session?.user

  if (!user) {
    redirect("/auth/login")
  }

  const { id } = await params

  // Fetch profile with company
  const [profile] = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      role: profiles.role,
      companyId: profiles.companyId,
      phone: profiles.phone,
      status: profiles.status,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
    })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1)

  if (!profile) {
    notFound()
  }

  // Fetch company if exists
  let companyName: string | undefined
  if (profile.companyId) {
    const [company] = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, profile.companyId))
      .limit(1)
    companyName = company?.name
  }

  // Build user details object
  const userDetails: UserDetails = {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName || "Sem nome",
    role: (profile.role as "super_admin" | "admin" | "user") || "user",
    companyName,
    companyId: profile.companyId || undefined,
    status: (profile.status as "active" | "inactive" | "suspended") || "active",
    lastLogin: new Date().toISOString(), // Would come from security_events in real implementation
    createdAt: profile.createdAt.toISOString(),
    totalLogins: 0, // Would come from security_events in real implementation
    phone: profile.phone || undefined,
    permissions: ["view_dashboard", "manage_users", "export_reports", "view_analytics"], // Would come from permissions table
  }

  // Mock login history - in real implementation, query security_events table
  const loginHistory: LoginHistory[] = [
    {
      id: 1,
      timestamp: "2024-03-15T10:15:00Z",
      ipAddress: "192.168.1.100",
      userAgent: "Chrome 122.0.0.0",
      location: "Sao Paulo, SP",
      status: "success",
    },
    {
      id: 2,
      timestamp: "2024-03-14T14:30:00Z",
      ipAddress: "192.168.1.100",
      userAgent: "Chrome 122.0.0.0",
      location: "Sao Paulo, SP",
      status: "success",
    },
    {
      id: 3,
      timestamp: "2024-03-13T09:45:00Z",
      ipAddress: "192.168.1.100",
      userAgent: "Chrome 122.0.0.0",
      location: "Sao Paulo, SP",
      status: "success",
    },
    {
      id: 4,
      timestamp: "2024-03-12T16:20:00Z",
      ipAddress: "10.0.0.50",
      userAgent: "Firefox 124.0",
      location: "Sao Paulo, SP",
      status: "failed",
    },
  ]

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
        return "Usuario"
      default:
        return "Usuario"
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
        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/super-admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={`/generic-placeholder-icon.png`} alt={userDetails.fullName} />
              <AvatarFallback className="bg-altea-gold/10 text-altea-navy">
                {userDetails.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{userDetails.fullName}</h1>
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
          <Button asChild variant="outline">
            <Link href={`/super-admin/users/${userDetails.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Configuracoes
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Logins</CardTitle>
            <LogIn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userDetails.totalLogins}</div>
            <p className="text-xs text-muted-foreground">Desde o cadastro</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ultimo Acesso</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Date(userDetails.lastLogin).toLocaleDateString("pt-BR")}</div>
            <p className="text-xs text-muted-foreground">
              {new Date(userDetails.lastLogin).toLocaleTimeString("pt-BR")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissoes</CardTitle>
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
            <div className="text-2xl font-bold">
              {Math.floor((Date.now() - new Date(userDetails.createdAt).getTime()) / (1000 * 60 * 60 * 24))} dias
            </div>
            <p className="text-xs text-muted-foreground">
              Desde {new Date(userDetails.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* User Information */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Informacoes do Usuario</CardTitle>
            <CardDescription>Dados pessoais e profissionais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Nome Completo</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{userDetails.fullName}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{userDetails.email}</p>
                  </div>
                </div>

                {userDetails.phone && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Telefone</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{userDetails.phone}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {userDetails.companyName && (
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Empresa</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{userDetails.companyName}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Funcao</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{getRoleLabel(userDetails.role)}</p>
                  </div>
                </div>

                {userDetails.department && (
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Departamento</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{userDetails.department}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Permissoes</h4>
              <div className="flex flex-wrap gap-2">
                {userDetails.permissions.map((permission) => (
                  <Badge key={permission} variant="outline" className="text-xs">
                    {permission.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status and Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Status do Usuario</CardTitle>
            <CardDescription>Informacoes de acesso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">Usuario Ativo</p>
                  <p className="text-sm text-green-700 dark:text-green-300">Ultimo login ha 1 dia</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">{userDetails.totalLogins} Logins Realizados</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Usuario ativo</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Acoes Rapidas</h4>
              <div className="space-y-2">
                <Button asChild className="w-full bg-transparent" variant="outline">
                  <Link href={`/super-admin/users/${userDetails.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Usuario
                  </Link>
                </Button>
                <Button asChild className="w-full bg-transparent" variant="outline">
                  <Link href={`/super-admin/users/${userDetails.id}/permissions`}>
                    <Shield className="mr-2 h-4 w-4" />
                    Gerenciar Permissoes
                  </Link>
                </Button>
                {userDetails.companyId && (
                  <Button asChild className="w-full bg-transparent" variant="outline">
                    <Link href={`/super-admin/companies/${userDetails.companyId}`}>
                      <Building2 className="mr-2 h-4 w-4" />
                      Ver Empresa
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle>Historico de Logins</CardTitle>
          <CardDescription>Ultimos acessos do usuario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loginHistory.map((login) => (
              <div key={login.id} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {login.status === "success" ? (
                    <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-full">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-full">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {login.status === "success" ? "Login realizado" : "Tentativa de login falhada"}
                    </p>
                    <Badge variant={login.status === "success" ? "default" : "destructive"} className="text-xs">
                      {login.status === "success" ? "Sucesso" : "Falha"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>{new Date(login.timestamp).toLocaleString("pt-BR")}</span>
                    <span>-</span>
                    <span>{login.ipAddress}</span>
                    <span>-</span>
                    <span>{login.userAgent}</span>
                    <span>-</span>
                    <span>{login.location}</span>
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
