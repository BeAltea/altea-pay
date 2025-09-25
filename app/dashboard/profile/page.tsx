"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Mail, Calendar, Save, CheckCircle, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({
    fullName: "",
    companyName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    description: "",
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUser(user)
        setProfile({
          fullName: user.user_metadata?.full_name || "",
          companyName: user.user_metadata?.company_name || "",
          email: user.email || "",
          phone: user.user_metadata?.phone || "",
          address: user.user_metadata?.address || "",
          city: user.user_metadata?.city || "",
          state: user.user_metadata?.state || "",
          zipCode: user.user_metadata?.zip_code || "",
          description: user.user_metadata?.description || "",
        })
      }
      setLoading(false)
    }

    getUser()
  }, [])

  const handleSave = async () => {
    console.log("[v0] ProfilePage - Save initiated with data:", profile)

    if (!profile.fullName.trim()) {
      console.log("[v0] ProfilePage - Validation failed: fullName is required")
      toast({
        title: "Erro",
        description: "Nome completo é obrigatório",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      console.log("[v0] ProfilePage - Updating user metadata...")

      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: profile.fullName,
          company_name: profile.companyName,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          state: profile.state,
          zip_code: profile.zipCode,
          description: profile.description,
        },
      })

      if (authError) {
        console.error("[v0] ProfilePage - Auth update error:", authError)
        throw authError
      }

      console.log("[v0] ProfilePage - Auth metadata updated successfully")

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          console.log("[v0] ProfilePage - Updating profiles table...")
          const { error: profileError } = await supabase.from("profiles").upsert({
            id: user.id,
            full_name: profile.fullName,
            company_name: profile.companyName,
            phone: profile.phone,
            address: profile.address,
            city: profile.city,
            state: profile.state,
            zip_code: profile.zipCode,
            description: profile.description,
            updated_at: new Date().toISOString(),
          })

          if (profileError) {
            console.warn("[v0] ProfilePage - Profile table update warning:", profileError)
          } else {
            console.log("[v0] ProfilePage - Profiles table updated successfully")
          }
        }
      } catch (profileTableError) {
        console.warn("[v0] ProfilePage - Profile table update failed:", profileTableError)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)

      console.log("[v0] ProfilePage - Save completed successfully")
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      })
    } catch (error) {
      console.error("[v0] ProfilePage - Save error:", error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
      console.log("[v0] ProfilePage - Save process completed")
    }
  }

  const handleUploadPhoto = () => {
    toast({
      title: "Upload de Foto",
      description: "Funcionalidade de upload de foto em desenvolvimento",
    })
  }

  const userInitials =
    profile.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    profile.email?.[0]?.toUpperCase() ||
    "U"

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie suas informações pessoais e da empresa</p>
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
        <Card>
          <CardHeader>
            <CardTitle>Foto do Perfil</CardTitle>
            <CardDescription>Atualize sua foto de perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="bg-blue-600 text-white text-xl">{userInitials}</AvatarFallback>
              </Avatar>
              <Button onClick={handleUploadPhoto} variant="outline" size="sm" className="cursor-pointer bg-transparent">
                <Upload className="mr-2 h-4 w-4" />
                Alterar Foto
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "-"}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{profile.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Atualize suas informações pessoais e de contato</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  placeholder="Seu nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input
                  id="companyName"
                  value={profile.companyName}
                  onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                  placeholder="Nome da sua empresa"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email} disabled className="bg-gray-50 dark:bg-gray-800" />
                <p className="text-xs text-gray-500">Para alterar o email, entre em contato com o suporte</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="Conte um pouco sobre você ou sua empresa..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Informações de endereço da empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Rua, número, complemento"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  placeholder="SP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={profile.zipCode}
                  onChange={(e) => setProfile({ ...profile, zipCode: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
