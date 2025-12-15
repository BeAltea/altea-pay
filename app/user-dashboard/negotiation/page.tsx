"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import {
  Clock,
  CheckCircle,
  Handshake,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  TrendingUp,
  MessageCircle,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CreateNegotiationDialog } from "@/components/user-dashboard/create-negotiation-dialog"
import { NegotiationCard } from "@/components/user-dashboard/negotiation-card"
import { NegotiationFilters } from "@/components/user-dashboard/negotiation-filters"
import { NegotiationResponseSimulator } from "@/components/user-dashboard/negotiation-response-simulator"

interface Negotiation {
  id: string
  status: "pending" | "accepted" | "rejected" | "counter_offer"
  original_amount: number
  proposed_amount: number
  discount_amount: number
  discount_percentage: number
  installments: number
  installment_amount: number
  payment_method: string
  terms: string
  attendant_name: string
  company_name: string
  customer_name: string
  due_date: string | null
  created_at: string
  updated_at: string
  debt_description: string
}

function NegotiationSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {[...Array(3)].map((_, j) => (
                <div key={j}>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function NegotiationPage() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([])
  const [filteredNegotiations, setFilteredNegotiations] = useState<Negotiation[]>([])
  const [availableDebts, setAvailableDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showResponseSimulator, setShowResponseSimulator] = useState(false)
  const [selectedNegotiation, setSelectedNegotiation] = useState<Negotiation | null>(null)

  useEffect(() => {
    fetchNegotiations()
    fetchAvailableDebts()
  }, [])

  const fetchNegotiations = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: realNegotiations, error } = await supabase
        .from("agreements")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching negotiations:", error)
        setNegotiations([])
        setFilteredNegotiations([])
      } else {
        const negotiationsWithDetails = await Promise.all(
          (realNegotiations || []).map(async (neg) => {
            let debtData = null
            let customerData = null
            let companyData = null

            // Fetch debt details
            if (neg.debt_id) {
              const { data: debt } = await supabase
                .from("debts")
                .select("id, description, amount, due_date, status")
                .eq("id", neg.debt_id)
                .single()
              debtData = debt
            }

            // Fetch customer details
            if (neg.customer_id) {
              const { data: customer } = await supabase
                .from("customers")
                .select("id, name")
                .eq("id", neg.customer_id)
                .single()
              customerData = customer
            }

            // Fetch company details
            if (neg.company_id) {
              const { data: company } = await supabase
                .from("companies")
                .select("id, name")
                .eq("id", neg.company_id)
                .single()
              companyData = company
            }

            return {
              id: neg.id,
              status: neg.status,
              original_amount: Number(neg.original_amount) || Number(debtData?.amount) || 0,
              proposed_amount: Number(neg.agreed_amount || neg.original_amount),
              discount_amount: Number(neg.discount_amount || 0),
              discount_percentage: Number(neg.discount_percentage || 0),
              installments: neg.installments || 1,
              installment_amount: Number(neg.installment_amount || 0),
              payment_method: neg.payment_method || "boleto",
              terms: neg.terms || "",
              attendant_name: neg.attendant_name || "Sistema",
              company_name: companyData?.name || "N/A",
              customer_name: customerData?.name || "N/A",
              due_date: neg.due_date || debtData?.due_date || null,
              created_at: neg.created_at,
              updated_at: neg.updated_at,
              debt_description: debtData?.description || "Dívida",
            }
          }),
        )

        setNegotiations(negotiationsWithDetails)
        setFilteredNegotiations(negotiationsWithDetails)
      }
    } catch (error) {
      console.error("Error fetching negotiations:", error)
      toast({
        title: "Erro ao carregar negociações",
        description: "Não foi possível carregar as negociações.",
        variant: "destructive",
      })
      setNegotiations([])
      setFilteredNegotiations([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableDebts = async () => {
    try {
      const {
        data: { user },
      } = await createClient().auth.getUser()
      if (!user) return

      const { data: debts, error } = await createClient()
        .from("debts")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["open", "overdue", "in_collection"])

      if (error) {
        console.error("Error fetching available debts:", error)
        setAvailableDebts([])
      } else {
        const debtsWithoutNegotiations = (debts || []).filter(
          (debt) => !negotiations.some((neg) => neg.debt_id === debt.id),
        )
        setAvailableDebts(debtsWithoutNegotiations)
      }
    } catch (error) {
      console.error("Error fetching available debts:", error)
      setAvailableDebts([])
    }
  }

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      fetchNegotiations()
      fetchAvailableDebts()
      toast({
        title: "Dados atualizados",
        description: "Negociações atualizadas com sucesso!",
      })
    }, 1000)
  }

  const handleExport = () => {
    const csvContent = [
      [
        "Data",
        "Cliente",
        "Descrição",
        "Valor Original",
        "Valor Proposto",
        "Desconto",
        "Parcelas",
        "Status",
        "Método de Pagamento",
        "Atendente",
      ],
      ...filteredNegotiations.map((negotiation) => [
        format(new Date(negotiation.created_at), "dd/MM/yyyy", { locale: ptBR }),
        negotiation.customer_name,
        negotiation.debt_description,
        negotiation.original_amount.toFixed(2),
        negotiation.proposed_amount.toFixed(2),
        negotiation.discount_amount.toFixed(2),
        negotiation.installments + "x",
        negotiation.status,
        negotiation.payment_method,
        negotiation.attendant_name,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `negociacoes-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportação concluída",
      description: "Relatório de negociações exportado com sucesso!",
    })
  }

  const handleSimulateResponse = (negotiation: Negotiation) => {
    console.log("[v0] Simulating response for negotiation:", negotiation.id)
    setSelectedNegotiation(negotiation)
    setShowResponseSimulator(true)
  }

  const totalNegotiations = negotiations.length
  const acceptedNegotiations = negotiations.filter((n) => n.status === "accepted").length
  const pendingNegotiations = negotiations.filter((n) => n.status === "pending").length
  const successRate = totalNegotiations > 0 ? (acceptedNegotiations / totalNegotiations) * 100 : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <NegotiationSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Negociações</h1>
          <p className="text-muted-foreground mt-1">Negocie suas dívidas e encontre a melhor solução</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} className="bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleExport} className="bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <CreateNegotiationDialog
            openDebts={availableDebts.map((debt) => ({
              id: debt.id,
              description: debt.description,
              amount: debt.amount.toString(),
              due_date: debt.due_date,
              status: debt.status,
              classification: debt.classification,
              propensity_payment_score: debt.propensity_payment_score.toString(),
              propensity_loan_score: debt.propensity_loan_score.toString(),
              created_at: debt.created_at,
            }))}
            triggerButton={
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Handshake className="h-4 w-4 mr-2" />
                Nova Negociação
              </Button>
            }
          />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Negociações</p>
                <p className="text-2xl font-bold text-foreground">{totalNegotiations}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Aceitas</p>
                <p className="text-2xl font-bold text-green-600">{acceptedNegotiations}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingNegotiations}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-foreground">{successRate.toFixed(1)}%</p>
                <Progress value={successRate} className="mt-2" />
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NegotiationFilters onFilter={setFilteredNegotiations} negotiations={negotiations} />
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Como funciona a negociação?</h3>
              <p className="text-sm text-blue-700">
                Você pode propor um valor menor e/ou parcelamento para suas dívidas. Nossa equipe analisará sua proposta
                e responderá em até 48 horas. Lembre-se: quanto mais detalhada sua justificativa, maiores as chances de
                aprovação.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Negotiations List */}
      <div className="space-y-4">
        {filteredNegotiations.map((negotiation) => (
          <NegotiationCard
            key={negotiation.id}
            negotiation={negotiation}
            onSimulateResponse={() => handleSimulateResponse(negotiation)}
          />
        ))}

        {filteredNegotiations.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Handshake className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma negociação encontrada</h3>
              <p className="text-muted-foreground mb-4">
                Comece uma nova negociação para encontrar a melhor solução para suas dívidas.
              </p>
              <CreateNegotiationDialog
                openDebts={availableDebts.map((debt) => ({
                  id: debt.id,
                  description: debt.description,
                  amount: debt.amount.toString(),
                  due_date: debt.due_date,
                  status: debt.status,
                  classification: debt.classification,
                  propensity_payment_score: debt.propensity_payment_score.toString(),
                  propensity_loan_score: debt.propensity_loan_score.toString(),
                  created_at: debt.created_at,
                }))}
                triggerButton={
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Handshake className="h-4 w-4 mr-2" />
                    Iniciar Negociação
                  </Button>
                }
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Response Simulator Modal */}
      {selectedNegotiation && (
        <NegotiationResponseSimulator
          isOpen={showResponseSimulator}
          onClose={() => {
            setShowResponseSimulator(false)
            setSelectedNegotiation(null)
          }}
          negotiation={selectedNegotiation}
        />
      )}
    </div>
  )
}
