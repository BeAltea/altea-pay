"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Search, Calendar, DollarSign, Handshake } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface VmaxCustomer {
  id: string
  name: string
  document: string
  totalDebt: number
  daysOverdue: number
  hasNegotiation: boolean
  isPaid: boolean
  isCancelled: boolean
  agreementId: string | null
  agreedAmount: number
  installments: number
  status: string
  paymentStatus: string | null
  createdAt: string | null
}

export default function AgreementsPage() {
  const [customers, setCustomers] = useState<VmaxCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const { profile, loading: authLoading } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (authLoading) return

    if (profile?.company_id) {
      fetchData()
    } else {
      console.log("[v0] Agreements - No company_id, skipping fetch")
      setLoading(false)
    }
  }, [profile?.company_id, authLoading])

  async function fetchData() {
    if (!profile?.company_id) {
      console.log("[v0] No company_id, skipping fetch")
      setLoading(false)
      return
    }

    setLoading(true)
    console.log("[v0] Fetching agreements data for company:", profile.company_id)

    try {
      // Step 1: Fetch ALL VMAX customers for this company (same as Super Admin)
      let vmaxRecords: any[] = []
      let page = 0
      const pageSize = 1000

      while (true) {
        const { data: pageData } = await supabase
          .from("VMAX")
          .select("*")
          .eq("id_company", profile.company_id)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (!pageData || pageData.length === 0) break
        vmaxRecords = [...vmaxRecords, ...pageData]
        if (pageData.length < pageSize) break
        page++
      }

      // Step 2: Fetch all agreements for this company
      const { data: agreements } = await supabase
        .from("agreements")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })

      // Step 3: Fetch customers table to map customer_id -> document
      const customerIds = [...new Set((agreements || []).map(a => a.customer_id).filter(Boolean))]
      let customerDocMap = new Map<string, string>()

      if (customerIds.length > 0) {
        const { data: customersData } = await supabase
          .from("customers")
          .select("id, document")
          .in("id", customerIds)

        if (customersData) {
          customersData.forEach((c: any) => {
            const normalizedDoc = (c.document || "").replace(/\D/g, "")
            if (normalizedDoc) {
              customerDocMap.set(c.id, normalizedDoc)
            }
          })
        }
      }

      // Step 4: Build maps from normalized document -> agreement info
      // This matches Super Admin's logic exactly
      const docToAgreements = new Map<string, any[]>()

      for (const a of agreements || []) {
        const normalizedDoc = customerDocMap.get(a.customer_id)
        if (!normalizedDoc) continue

        if (!docToAgreements.has(normalizedDoc)) {
          docToAgreements.set(normalizedDoc, [])
        }
        docToAgreements.get(normalizedDoc)!.push(a)
      }

      // Step 5: For each VMAX customer, determine negotiation status
      // This matches Super Admin's hasNegotiation logic exactly
      const customersWithNegotiations: VmaxCustomer[] = []

      for (const vmax of vmaxRecords) {
        const cpfCnpj = (vmax["CPF/CNPJ"] || "").replace(/\D/g, "")
        const customerAgreements = docToAgreements.get(cpfCnpj) || []

        // Filter to non-cancelled agreements
        const activeAgreements = customerAgreements.filter(a => a.status !== "cancelled")
        const cancelledAgreements = customerAgreements.filter(a => a.status === "cancelled")

        // Check if has any non-cancelled agreement (matches Super Admin's hasNegotiation)
        const hasNegotiation = activeAgreements.length > 0

        // Only include customers who have negotiations (to match "Enviada" filter)
        if (!hasNegotiation) continue

        // Get the latest active agreement for this customer
        const latestAgreement = activeAgreements[0] // Already sorted by created_at desc

        // Check if paid
        const isPaid = activeAgreements.some(a =>
          a.status === "completed" || a.status === "paid" ||
          a.payment_status === "received" || a.payment_status === "confirmed"
        )

        // Check if was cancelled but has no active agreement (can send new)
        const isCancelled = cancelledAgreements.length > 0 && activeAgreements.length === 0

        // Parse debt value
        const vencidoStr = String(vmax.Vencido || "0")
        const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
        const totalDebt = Number(cleanValue) || 0

        const diasInadStr = String(vmax["Dias Inad."] || "0")
        const daysOverdue = Number(diasInadStr.replace(/\./g, "")) || 0

        customersWithNegotiations.push({
          id: vmax.id,
          name: vmax.Cliente || "Cliente",
          document: vmax["CPF/CNPJ"] || "N/A",
          totalDebt,
          daysOverdue: isPaid ? 0 : daysOverdue,
          hasNegotiation: true,
          isPaid,
          isCancelled,
          agreementId: latestAgreement?.id || null,
          agreedAmount: Number(latestAgreement?.agreed_amount) || 0,
          installments: latestAgreement?.installments || 1,
          status: latestAgreement?.status || "active",
          paymentStatus: latestAgreement?.payment_status || null,
          createdAt: latestAgreement?.created_at || null,
        })
      }

      setCustomers(customersWithNegotiations)
      console.log("[v0] Customers with negotiations:", customersWithNegotiations.length)
    } catch (error: any) {
      console.error("[v0] Unexpected error fetching data:", error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch = !searchTerm ||
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.document?.includes(searchTerm)

      let matchesStatus = true
      if (statusFilter === "active") {
        matchesStatus = customer.status === "active" || customer.status === "draft"
      } else if (statusFilter === "completed") {
        matchesStatus = customer.status === "completed" || customer.isPaid
      }

      return matchesSearch && matchesStatus
    })
  }, [customers, searchTerm, statusFilter])

  // Stats - count customers (not agreements), sum their agreed amounts
  const totalCount = customers.length
  const totalAgreedValue = customers.reduce((sum, c) => sum + c.agreedAmount, 0)
  const completedValue = customers
    .filter(c => c.isPaid || c.status === "completed")
    .reduce((sum, c) => sum + c.agreedAmount, 0)
  const averageInstallments = totalCount > 0
    ? customers.reduce((sum, c) => sum + c.installments, 0) / totalCount
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
              <p className="text-2xl font-bold">{totalCount}</p>
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
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold">{customer.name}</h3>
                  <Badge
                    variant={
                      customer.isPaid || customer.status === "completed"
                        ? "secondary"
                        : customer.status === "active" || customer.status === "draft"
                          ? "default"
                          : "destructive"
                    }
                  >
                    {customer.isPaid || customer.status === "completed"
                      ? "Concluído"
                      : customer.status === "active" || customer.status === "draft"
                        ? "Ativo"
                        : "Pendente"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {customer.document}
                </p>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Dívida Original</p>
                    <p className="font-medium">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(customer.totalDebt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Acordado</p>
                    <p className="font-medium text-green-600">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(customer.agreedAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dias em Atraso</p>
                    <p className="font-medium">{customer.daysOverdue}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Parcelas</p>
                    <p className="font-medium">{customer.installments}x</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredCustomers.length === 0 && (
          <Card className="p-12 text-center">
            <Handshake className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum acordo encontrado</p>
          </Card>
        )}
      </div>
    </div>
  )
}
