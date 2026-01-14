"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Mail, Calendar, Save, CheckCircle, Phone, Building } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  company_name: string | null
  role: string | null
  created_at: string
  updated_at: string
}

export default function UserProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    companyName: "",
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false) // Declare the saving variable
  const { toast } = useToast()

  const supabase = createBrowserClient()

  useEffect(() => {
    const getUser = async () => {
      console.log("[v0] Profile - Getting user data")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        console.log("[v0] Profile - User found:", user.id)
        setUser(user)

        // Buscar perfil do usuário na tabela profiles
        const { data: profileData, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (error) {
          console.log("[v0] Profile - Error fetching profile:", error)
          // Se não existe perfil, criar um básico
          const newProfile = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || "",
            phone: user.user_metadata?.phone || "",
            company_name: user.user_metadata?.company_name || "",
            role: "user",
          }

          const { error: insertError } = await supabase.from("profiles").insert([newProfile])

          if (!insertError) {
            setProfile(newProfile as UserProfile)
            setFormData({
              fullName: newProfile.full_name || "",
              phone: newProfile.phone || "",
              companyName: newProfile.company_name || "",
            })
          }
        } else {
          console.log("[v0] Profile - Profile data:", profileData)
          setProfile(profileData)
          setFormData({
            fullName: profileData.full_name || "",
            phone: profileData.phone || "",
            companyName: profileData.company_name || "",
          })
        }
      }
      setLoading(false)
    }

    getUser()
  }, [])

  const handleSave = async () => {
    if (!formData.fullName.trim()) {
      toast({
        title: "Erro",
        description: "Nome completo é obrigatório",
        variant: "destructive",
      })
      return
    }

    if (!user) return

    setSaving(true)

    try {
      console.log("[v0] Profile - Updating profile for user:", user.id)

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          company_name: formData.companyName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      // Atualizar também os metadados do usuário no auth
      await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          phone: formData.phone,
          company_name: formData.companyName,
        },
      })

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      })

      console.log("[v0] Profile - Profile updated successfully")
    } catch (error) {
      console.log("[v0] Profile - Error updating profile:", error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const userInitials =
    formData.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U"

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      {saved && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-400">
            Perfil atualizado com sucesso!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar e informações básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>Suas informações de conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="bg-altea-navy text-altea-gold text-xl">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="font-semibold text-lg">{formData.fullName || "Usuário"}</h3>
                <p className="text-sm text-muted-foreground">Cliente Ativo</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Cliente desde {user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "-"}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user?.email}</span>
              </div>
              {formData.phone && (
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{formData.phone}</span>
                </div>
              )}
              {formData.companyName && (
                <div className="flex items-center space-x-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{formData.companyName}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Formulário de edição */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Editar Informações</CardTitle>
            <CardDescription>Atualize suas informações pessoais e de contato</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Para alterar o email, entre em contato com o suporte</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Empresa (opcional)</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Nome da sua empresa"
              />
            </div>

            <div className="pt-4">
              <Button onClick={handleSave} disabled={saving} className="w-full cursor-pointer">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Conta</CardTitle>
          <CardDescription>Detalhes sobre sua conta no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-altea-navy dark:text-altea-gold">
                {profile?.role === "user" ? "Cliente" : "Usuário"}
              </div>
              <div className="text-sm text-muted-foreground">Tipo de Conta</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-altea-navy dark:text-altea-gold">Ativo</div>
              <div className="text-sm text-muted-foreground">Status da Conta</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-altea-navy dark:text-altea-gold">
                {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString("pt-BR") : "-"}
              </div>
              <div className="text-sm text-muted-foreground">Última Atualização</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
