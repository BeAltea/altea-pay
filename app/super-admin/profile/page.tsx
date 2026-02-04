"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { User, Shield, Calendar, Edit3, Save, X } from "lucide-react"

interface ProfileData {
  id: string
  fullName: string
  email: string
  phone: string | null
  createdAt: string
  updatedAt: string
  role: string
}

export default function SuperAdminProfilePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
  })

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/super-admin/profile")

      if (!response.ok) {
        console.error("Error fetching profile")
        toast({
          title: "Erro",
          description: "Erro ao carregar perfil.",
          variant: "destructive",
        })
        return
      }

      const data = await response.json()

      setProfile(data)
      setFormData({
        fullName: data.fullName || "",
        phone: data.phone || "",
      })
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar perfil.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      const response = await fetch("/api/super-admin/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        console.error("Error updating profile")
        toast({
          title: "Erro",
          description: "Erro ao salvar perfil.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso.",
      })

      setEditing(false)
      fetchProfile()
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao salvar perfil.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      fullName: profile?.fullName || "",
      phone: profile?.phone || "",
    })
    setEditing(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getUserInitials = () => {
    if (profile?.fullName) {
      return profile.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    }
    return profile?.email?.[0].toUpperCase() || "SA"
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

  if (!profile) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Erro ao carregar perfil.</p>
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
            <p className="text-gray-500 dark:text-gray-400">Gerencie suas informacoes pessoais</p>
          </div>
          <div className="flex items-center space-x-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informacoes Pessoais</span>
            </CardTitle>
            <CardDescription>Suas informacoes basicas de perfil</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="bg-altea-navy text-altea-gold text-lg">{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Nome Completo</Label>
                    {editing ? (
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Digite seu nome completo"
                      />
                    ) : (
                      <p className="text-sm font-medium mt-1">{profile.fullName || "Nao informado"}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <p className="text-sm font-medium mt-1 text-gray-500">{profile.email}</p>
                    <p className="text-xs text-gray-400 mt-1">Email nao pode ser alterado</p>
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    {editing ? (
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="Digite seu telefone"
                      />
                    ) : (
                      <p className="text-sm font-medium mt-1">{profile.phone || "Nao informado"}</p>
                    )}
                  </div>
                  <div>
                    <Label>Funcao</Label>
                    <div className="mt-1">
                      <Badge className="bg-altea-gold text-altea-navy">
                        <Shield className="h-3 w-3 mr-1" />
                        Super Administrador
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Informacoes da Conta</span>
            </CardTitle>
            <CardDescription>Detalhes sobre sua conta no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Conta criada em</Label>
                <p className="text-sm font-medium">{formatDate(profile.createdAt)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Ultima atualizacao</Label>
                <p className="text-sm font-medium">{formatDate(profile.updatedAt)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">ID do usuario</Label>
                <p className="text-sm font-mono text-gray-600 dark:text-gray-400">{profile.id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Nivel de acesso</Label>
                <p className="text-sm font-medium text-altea-navy dark:text-altea-gold">Acesso total ao sistema</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Permissoes de Sistema</span>
            </CardTitle>
            <CardDescription>Suas permissoes como Super Administrador</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm">Gerenciar todas as empresas</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm">Gerenciar todos os usuarios</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm">Acessar relatorios globais</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm">Configuracoes do sistema</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm">Logs de auditoria</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm">Analytics avancados</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
