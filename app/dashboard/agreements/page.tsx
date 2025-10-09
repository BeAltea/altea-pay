"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Search, Download, Calendar, DollarSign } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

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
  customer: {
    name: string
    document: string
  }
  debt: {
    description: string
    due_date: string
  }
}

interface Payment {
  id: string
  debt_id: string
  customer_id: string
  amount: number
  payment_date: string
  payment_method: string
  status: string
  created_at: string
  customer: {
    name: string
    document: string
  }
  debt: {
    description: string
  }
}

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState<"agreements" | "payments">("agreements")
  const { profile, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (authLoading) return

    if (profile?.company_id) {
      fetchData()
    } else {
      console.log("[v0] Agreements - No company_id, skipping fetch")
      setLoading(false)
      toast({
        title: "Aviso",
        description: "Empresa não identificada. Entre em contato com o suporte.",
        variant: "destructive",
      })
    }
  }, [profile?.company_id, activeTab, authLoading])

  async function fetchData() {
    setLoading(true)
    try {
      if (activeTab === "agreements") {
        await fetchAgreements()
      } else {
        await fetchPayments()
      }
    } catch (error: any) {
      console.error("[v0] Agreements - Error fetching data:", error)
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function fetchAgreements() {
    if (!profile?.company_id) {
      console.log("[v0] No company_id, skipping fetch")
      return
    }

    console.log("[v0] Fetching agreements for company:", profile.company_id)

    const { data, error } = await supabase
      .from("agreements")
      .select(`
        *,
        customer:customers(name, document),
        debt:debts(description, due_date)
      `)
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching agreements:", error)
      throw error
    }

    console.log("[v0] Fetched agreements:", data?.length || 0)
    setAgreements(data || [])
  }

  async function fetchPayments() {
    if (!profile?.company_id) {
      console.log("[v0] No company_id, skipping fetch")
      return
    }

    console.log("[v0] Fetching payments for company:", profile.company_id)

    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        customer:customers(name, document),
        debt:debts(description)
      `)
      .eq("company_id", profile.company_id)
      .order("payment_date", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching payments:", error)
      throw error
    }

    console.log("[v0] Fetched payments:", data?.length || 0)
    setPayments(data || [])
  }

  const filteredAgreements = agreements.filter((agreement) => {
    const matchesSearch =
      agreement.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agreement.customer?.document?.includes(searchTerm) ||
      false
    const matchesStatus = statusFilter === "all" || agreement.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer?.document?.includes(searchTerm) ||
      false
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalRecovered = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

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
        <h1 className="text-3xl font-bold">Acordos e Pagamentos</h1>
        <p className="text-muted-foreground">Gerencie acordos de negociação e pagamentos recebidos</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-500" />
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
              <p className="text-sm text-muted-foreground">Valor Recuperado</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalRecovered)}
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
              <p className="text-sm text-muted-foreground">Pagamentos</p>
              <p className="text-2xl font-bold">{payments.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "agreements"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("agreements")}
        >
          Acordos ({agreements.length})
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "payments"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("payments")}
        >
          Pagamentos ({payments.length})
        </button>
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
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Content */}
      {activeTab === "agreements" ? (
        <div className="space-y-4">
          {filteredAgreements.map((agreement) => (
            <Card key={agreement.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{agreement.customer?.name || "Cliente não identificado"}</h3>
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
                    {agreement.customer?.document || "N/A"} • {agreement.debt?.description || "Sem descrição"}
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
                <Button variant="outline" size="sm">
                  Ver Detalhes
                </Button>
              </div>
            </Card>
          ))}

          {filteredAgreements.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum acordo encontrado</p>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => (
            <Card key={payment.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{payment.customer?.name || "Cliente não identificado"}</h3>
                    <Badge
                      variant={
                        payment.status === "completed"
                          ? "default"
                          : payment.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {payment.status === "completed"
                        ? "Confirmado"
                        : payment.status === "pending"
                          ? "Pendente"
                          : "Cancelado"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {payment.customer?.document || "N/A"} • {payment.debt?.description || "Sem descrição"}
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Valor</p>
                      <p className="font-medium text-green-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(payment.amount) || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Data do Pagamento</p>
                      <p className="font-medium">{new Date(payment.payment_date).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Método</p>
                      <p className="font-medium capitalize">{payment.payment_method}</p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Ver Comprovante
                </Button>
              </div>
            </Card>
          ))}

          {filteredPayments.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
