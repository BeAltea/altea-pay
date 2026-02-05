"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { User, Save, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { getUserById, getCompanies, updateUserProfile } from "@/app/actions/user-actions"
import { useToast } from "@/hooks/use-toast"

interface UserFormData {
  full_name: string
  email: string
  role: "super_admin" | "admin" | "user"
  status: "active" | "inactive" | "suspended"
  phone: string
  address: string
  city: string
  state: string
  notes: string
  company_id: string
}

interface Company {
  id: string
  name: string
}

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])

  const [formData, setFormData] = useState<UserFormData>({
    full_name: "",
    email: "",
    role: "user",
    status: "active",
    phone: "",
    address: "",
    city: "",
    state: "",
    notes: "",
    company_id: "",
  })

  useEffect(() => {
    async function fetchData() {
      setIsFetching(true)
      try {
        // Fetch user data
        const userResult = await getUserById(params.id)
        if (userResult.success && userResult.data) {
          const user = userResult.data
          setFormData({
            full_name: user.full_name || "",
            email: user.email || "",
            role: user.role || "user",
            status: user.status || "active",
            phone: user.phone || "",
            address: user.address || "",
            city: user.city || "",
            state: user.state || "",
            notes: user.notes || "",
            company_id: user.company_id || "",
          })
        } else {
          toast({
            title: "Erro",
            description: "Usuário não encontrado",
            variant: "destructive",
          })
          router.push("/super-admin/users")
          return
        }

        // Fetch companies
        const companiesResult = await getCompanies()
        if (companiesResult.success) {
          setCompanies(companiesResult.data)
        }
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
        toast({
          title: "Erro",
          description: "Erro ao carregar dados do usuário",
          variant: "destructive",
        })
      } finally {
        setIsFetching(false)
      }
    }

    fetchData()
  }, [params.id, router, toast])

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await updateUserProfile({
        id: params.id,
        full_name: formData.full_name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        company_id: formData.company_id || null,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        notes: formData.notes,
      })

      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Dados do usuário atualizados com sucesso!",
        })
        router.push(`/super-admin/users/${params.id}`)
      } else {
        toast({
          title: "Erro",
          description: result.message || "Erro ao atualizar usuário",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error updating user:", error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuário",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-altea-gold" />
          <p className="text-gray-600 dark:text-gray-400">Carregando dados do usuário...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={`/generic-placeholder-icon.png`} alt={formData.full_name} />
            <AvatarFallback className="bg-altea-gold/10 text-altea-navy text-lg">
              {formData.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2) || "??"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Editar Usuário</h1>
            <p className="text-gray-600 dark:text-gray-400">{formData.full_name || "Carregando..."}</p>
          </div>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild variant="outline">
            <Link href={`/super-admin/users/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informações Básicas</span>
            </CardTitle>
            <CardDescription>Dados principais do usuário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange("full_name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  disabled
                  className="bg-gray-100 dark:bg-gray-800"
                />
                <p className="text-xs text-gray-500">O email não pode ser alterado</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Função *</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Administrador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.role !== "super_admin" && (
              <div className="space-y-2">
                <Label htmlFor="company_id">Empresa</Label>
                <Select 
                  value={formData.company_id || "none"} 
                  onValueChange={(value) => handleInputChange("company_id", value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma empresa</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Informações de localização do usuário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Rua, número, complemento"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  placeholder="SP"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
            <CardDescription>Informações adicionais sobre o usuário</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={4}
                placeholder="Adicione observações sobre o usuário..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href={`/super-admin/users/${params.id}`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
