"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Search, Calendar, DollarSign, Handshake } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface Agreement {
  id: string
  customer_id: string
  debt_id: string
  original_amount: number
  agreed_amount: number
  discount_percentage: number
  installments: number
  installment_amount: number
  status: string
  created_at: string
  customer_name?: string
  customer_document?: string
  debt_description?: string
  debt_due_date?: string
}

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const { profile, loading: authLoading } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (authLoading) return

    if (profile?.company_id) {
      fetchAgreements()
    } else {
      console.log("[v0] Agreements - No company_id, skipping fetch")
      setLoading(false)
    }
  }, [profile?.company_id, authLoading])

  async function fetchAgreements() {
    if (!profile?.company_id) {
      console.log("[v0] No company_id, skipping fetch")
      setLoading(false)
      return
    }

    setLoading(true)
    console.log("[v0] Fetching agreements for company:", profile.company_id)

    try {
      // Fetch non-cancelled agreements (aligns with Dashboard and Super Admin)
      const { data: agreementsData, error: agreementsError } = await supabase
        .from("agreements")
        .select("*")
        .eq("company_id", profile.company_id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })

      if (agreementsError) {
        console.error("[v0] Error fetching agreements:", agreementsError)
        // Don't throw - just show empty state
        setAgreements([])
        setLoading(false)
        return
      }

      // If we have agreements, get customer info from customers table
      if (agreementsData && agreementsData.length > 0) {
        const customerIds = [...new Set(agreementsData.map(a => a.customer_id).filter(Boolean))]

        if (customerIds.length > 0) {
          // Fetch from customers table (where agreement.customer_id points)
          const { data: customersData } = await supabase
            .from("customers")
            .select("id, name, document")
            .in("id", customerIds)

          const customerMap = new Map<string, { name: string; document: string }>()
          if (customersData) {
            customersData.forEach((c: any) => {
              customerMap.set(c.id, { name: c.name || "", document: c.document || "" })
            })
          }

          // Enrich agreements with customer data
          const enrichedAgreements = agreementsData.map(agreement => ({
            ...agreement,
            customer_name: customerMap.get(agreement.customer_id)?.name || null,
            customer_document: customerMap.get(agreement.customer_id)?.document || null,
          }))

          setAgreements(enrichedAgreements)
        } else {
          setAgreements(agreementsData)
        }
      } else {
        setAgreements([])
      }

      console.log("[v0] Fetched agreements:", agreementsData?.length || 0)
    } catch (error: any) {
      console.error("[v0] Unexpected error fetching agreements:", error)
      setAgreements([])
    } finally {
      setLoading(false)
    }
  }

  const filteredAgreements = agreements.filter((agreement) => {
    // When searchTerm is empty, match all
    const matchesSearch = !searchTerm ||
      agreement.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.customer_document?.includes(searchTerm)
    const matchesStatus = statusFilter === "all" || agreement.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Stats calculated from all fetched agreements (cancelled are already excluded from query)
  const totalAgreedValue = agreements.reduce((sum, a) => sum + (Number(a.agreed_amount) || 0), 0)

  const completedValue = agreements
    .filter(a => a.status === "completed")
    .reduce((sum, a) => sum + (Number(a.agreed_amount) || 0), 0)

  const averageInstallments =
    agreements.length > 0
      ? agreements.reduce((sum, a) => sum + (Number(a.installments) || 0), 0) / agreements.length
      : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Acordos</h1>
        <p className="text-muted-foreground">Acompanhe os acordos de negociação com seus clientes</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Handshake className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total de Acordos</p>
              <p className="text-2xl font-bold">{agreements.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Valor Concluído</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(completedValue)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Média de Parcelas</p>
              <p className="text-2xl font-bold">{Number(averageInstallments || 0).toFixed(1)}x</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Valor Total Acordado</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalAgreedValue)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="space-y-4">
          {filteredAgreements.map((agreement) => (
            <Card key={agreement.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{agreement.customer_name || "Cliente não identificado"}</h3>
                    <Badge
                      variant={
                        agreement.status === "active"
                          ? "default"
                          : agreement.status === "completed"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {agreement.status === "active"
                        ? "Ativo"
                        : agreement.status === "completed"
                          ? "Concluído"
                          : "Cancelado"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {agreement.customer_document || "N/A"}
                  </p>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Valor Original</p>
                      <p className="font-medium">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(agreement.original_amount) || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor Acordado</p>
                      <p className="font-medium text-green-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(agreement.agreed_amount) || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Desconto</p>
                      <p className="font-medium">{Number(agreement.discount_percentage || 0).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Parcelas</p>
                      <p className="font-medium">
                        {Number(agreement.installments) || 0}x de{" "}
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(agreement.installment_amount) || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {filteredAgreements.length === 0 && (
            <Card className="p-12 text-center">
              <Handshake className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum acordo encontrado</p>
            </Card>
          )}
      </div>
    </div>
  )
}
