"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Shield, User, Settings, BarChart3, Users, Building2 } from "lucide-react"

interface Permission {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
}

interface UserProfile {
  id: string
  fullName: string
  email: string
  role: string
  companyName: string
}

export default function UserPermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])

  useEffect(() => {
    fetchUserAndPermissions()
  }, [userId])

  const fetchUserAndPermissions = async () => {
    try {
      setLoading(true)

      // Fetch user profile via API
      const response = await fetch(`/api/super-admin/users/${userId}`)

      if (!response.ok) {
        console.error("Error fetching user")
        toast({
          title: "Erro",
          description: "Erro ao carregar dados do usuario.",
          variant: "destructive",
        })
        return
      }

      const userData = await response.json()
      setUser(userData)

      // Mock permissions data - in real app, this would come from database
      const mockPermissions: Permission[] = [
        {
          id: "dashboard_view",
          name: "Visualizar Dashboard",
          description: "Permite visualizar o dashboard principal",
          category: "Dashboard",
          enabled: true,
        },
        {
          id: "users_manage",
          name: "Gerenciar Usuarios",
          description: "Criar, editar e excluir usuarios",
          category: "Usuarios",
          enabled: userData.role === "admin",
        },
        {
          id: "companies_manage",
          name: "Gerenciar Empresas",
          description: "Criar, editar e excluir empresas",
          category: "Empresas",
          enabled: userData.role === "super_admin",
        },
        {
          id: "reports_view",
          name: "Visualizar Relatorios",
          description: "Acessar relatorios e analytics",
          category: "Relatorios",
          enabled: true,
        },
        {
          id: "system_settings",
          name: "Configuracoes do Sistema",
          description: "Alterar configuracoes globais do sistema",
          category: "Sistema",
          enabled: userData.role === "super_admin",
        },
        {
          id: "audit_logs",
          name: "Logs de Auditoria",
          description: "Visualizar logs de auditoria do sistema",
          category: "Sistema",
          enabled: userData.role === "super_admin",
        },
      ]

      setPermissions(mockPermissions)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar dados.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionToggle = (permissionId: string) => {
    setPermissions((prev) =>
      prev.map((permission) =>
        permission.id === permissionId ? { ...permission, enabled: !permission.enabled } : permission,
      ),
    )
  }

  const handleSavePermissions = async () => {
    try {
      setSaving(true)

      // In a real app, you would save permissions to database
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Sucesso",
        description: "Permissoes atualizadas com sucesso.",
      })
    } catch (error) {
      console.error("Error saving permissions:", error)
      toast({
        title: "Erro",
        description: "Erro ao salvar permissoes.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getPermissionsByCategory = () => {
    const categories = permissions.reduce(
      (acc, permission) => {
        if (!acc[permission.category]) {
          acc[permission.category] = []
        }
        acc[permission.category].push(permission)
        return acc
      },
      {} as Record<string, Permission[]>,
    )

    return categories
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Dashboard":
        return BarChart3
      case "Usuarios":
        return Users
      case "Empresas":
        return Building2
      case "Relatorios":
        return BarChart3
      case "Sistema":
        return Settings
      default:
        return Shield
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Usuario nao encontrado.</p>
            <Button onClick={() => router.back()} className="mt-4">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Permissoes do Usuario</h1>
              <p className="text-gray-500 dark:text-gray-400">Gerencie as permissoes de acesso do usuario</p>
            </div>
          </div>
          <Button onClick={handleSavePermissions} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alteracoes"}
          </Button>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informacoes do Usuario</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Nome</Label>
                <p className="text-sm font-medium">{user.fullName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Email</Label>
                <p className="text-sm">{user.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Funcao</Label>
                <Badge variant={user.role === "super_admin" ? "default" : "secondary"}>
                  {user.role === "super_admin" ? "Super Admin" : user.role === "admin" ? "Admin" : "Usuario"}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Empresa</Label>
                <p className="text-sm">{user.companyName || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <div className="space-y-4">
          {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => {
            const IconComponent = getCategoryIcon(category)
            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <IconComponent className="h-5 w-5" />
                    <span>{category}</span>
                  </CardTitle>
                  <CardDescription>Permissoes relacionadas a {category.toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categoryPermissions.map((permission, index) => (
                      <div key={permission.id}>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label htmlFor={permission.id} className="text-sm font-medium">
                              {permission.name}
                            </Label>
                            <p className="text-xs text-gray-500">{permission.description}</p>
                          </div>
                          <Switch
                            id={permission.id}
                            checked={permission.enabled}
                            onCheckedChange={() => handlePermissionToggle(permission.id)}
                          />
                        </div>
                        {index < categoryPermissions.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
