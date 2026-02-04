"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter, useParams } from "next/navigation"
import { User, Save, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"

interface UserData {
  id: string
  fullName: string
  email: string
  role: "super_admin" | "admin" | "user"
  status: "active" | "inactive" | "suspended"
  phone: string | null
  companyId: string | null
  companyName: string | null
}

interface Company {
  id: string
  name: string
}

export default function EditUserPage() {
  const params = useParams()
  const userId = params.id as string
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])

  const [formData, setFormData] = useState<UserData>({
    id: "",
    fullName: "",
    email: "",
    role: "user",
    status: "active",
    phone: "",
    companyId: null,
    companyName: null,
  })

  // Fetch user data
  useEffect(() => {
    if (!userId) return

    const fetchUserData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        console.log("[v0] Fetching user data for ID:", userId)

        const response = await fetch(`/api/super-admin/users/${userId}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch user data")
        }

        const userData = await response.json()
        console.log("[v0] User data fetched:", userData)

        setFormData({
          id: userData.id,
          fullName: userData.fullName || "",
          email: userData.email || "",
          role: userData.role || "user",
          status: userData.status || "active",
          phone: userData.phone || "",
          companyId: userData.companyId || null,
          companyName: userData.companyName || null,
        })
      } catch (err) {
        console.error("[v0] Error fetching user:", err)
        setError(err instanceof Error ? err.message : "Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    // Fetch companies
    const fetchCompanies = async () => {
      try {
        const response = await fetch("/api/super-admin/companies")
        if (response.ok) {
          const data = await response.json()
          setCompanies(data || [])
        }
      } catch (err) {
        console.error("[v0] Error fetching companies:", err)
      }
    }

    fetchUserData()
    fetchCompanies()
  }, [userId])

  const handleInputChange = (field: keyof UserData, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      console.log("[v0] Saving user data:", formData)

      const response = await fetch(`/api/super-admin/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          phone: formData.phone || null,
          companyId: formData.companyId || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update user")
      }

      const updatedUser = await response.json()
      console.log("[v0] User updated successfully:", updatedUser)

      router.push(`/super-admin/users/${userId}`)
    } catch (err) {
      console.error("[v0] Error updating user:", err)
      setError(err instanceof Error ? err.message : "Failed to update user")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error && !formData.id) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-red-500">{error}</p>
        <Button asChild variant="outline">
          <Link href="/super-admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para lista
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={`/generic-placeholder-icon.png`} alt={formData.fullName} />
            <AvatarFallback className="bg-altea-gold/10 text-altea-navy text-lg">
              {formData.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() || "??"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Editar Usuario</h1>
            <p className="text-gray-600 dark:text-gray-400">{formData.fullName || formData.email}</p>
          </div>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild variant="outline">
            <Link href={`/super-admin/users/${userId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informacoes Basicas</span>
            </CardTitle>
            <CardDescription>Dados principais do usuario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
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
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Funcao *</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Administrador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="user">Usuario</SelectItem>
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
                <Label htmlFor="companyId">Empresa</Label>
                <Select
                  value={formData.companyId || "none"}
                  onValueChange={(value) => handleInputChange("companyId", value === "none" ? null : value)}
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
                value={formData.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" asChild>
            <Link href={`/super-admin/users/${userId}`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alteracoes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
