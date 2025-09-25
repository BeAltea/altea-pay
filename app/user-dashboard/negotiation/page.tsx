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
import { MOCK_DEBTS, getOpenDebts } from "@/lib/mock-data"

interface Negotiation {
  id: string
  debt_id: string
  status: "pending" | "accepted" | "rejected" | "counter_offer"
  original_amount: number
  proposed_amount: number
  installments: number
  created_at: string
  updated_at: string
  user_message: string
  admin_response?: string
  debt: {
    description: string
    amount: number
    customer: {
      name: string
    }
  }
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

  const supabase = createClient()

  useEffect(() => {
    fetchNegotiations()
    fetchAvailableDebts()
  }, [])

  const fetchNegotiations = async () => {
    try {
      const mockNegotiations: Negotiation[] = [
        {
          id: "1",
          debt_id: "1", // References debt from MOCK_DEBTS
          status: "pending",
          original_amount: 2500.0,
          proposed_amount: 1800.0,
          installments: 3,
          created_at: "2024-01-15T10:30:00Z",
          updated_at: "2024-01-15T10:30:00Z",
          user_message:
            "Gostaria de negociar um desconto devido a dificuldades financeiras temporárias. Posso pagar à vista com desconto ou parcelar em até 3x.",
          debt: {
            description: "Fatura Janeiro 2024 - Serviços de Consultoria Empresarial",
            amount: 2500.0,
            customer: { name: "João Silva Santos" },
          },
        },
        {
          id: "2",
          debt_id: "5", // References debt from MOCK_DEBTS
          status: "accepted",
          original_amount: 1200.0,
          proposed_amount: 1000.0,
          installments: 2,
          created_at: "2024-01-10T14:20:00Z",
          updated_at: "2024-01-12T09:15:00Z",
          user_message: "Posso pagar R$ 1.000 em 2x sem juros? Estou passando por uma reestruturação financeira.",
          admin_response:
            "Proposta aceita! Você pode pagar em 2 parcelas de R$ 500,00. Primeira parcela vence em 15 dias e a segunda em 45 dias. Enviaremos os boletos por email.",
          debt: {
            description: "Suporte Técnico - Pacote Premium Q1 2024",
            amount: 1200.0,
            customer: { name: "Roberto Lima Pereira" },
          },
        },
      ]

      setNegotiations(mockNegotiations)
      setFilteredNegotiations(mockNegotiations)
    } catch (error) {
      console.error("Error fetching negotiations:", error)
      toast({
        title: "Erro ao carregar negociações",
        description: "Não foi possível carregar as negociações.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableDebts = async () => {
    try {
      console.log("[v0] Negotiation - Using centralized debt data for available debts")
      const openDebts = getOpenDebts(MOCK_DEBTS)

      // Filter out debts that already have negotiations
      const debtsWithoutNegotiations = openDebts.filter((debt) => !negotiations.some((neg) => neg.debt_id === debt.id))

      setAvailableDebts(debtsWithoutNegotiations)
    } catch (error) {
      console.error("Error fetching available debts:", error)
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
      ["Data", "Cliente", "Descrição", "Valor Original", "Valor Proposto", "Desconto", "Parcelas", "Status"],
      ...filteredNegotiations.map((negotiation) => [
        format(new Date(negotiation.created_at), "dd/MM/yyyy", { locale: ptBR }),
        negotiation.debt.customer.name,
        negotiation.debt.description,
        negotiation.original_amount.toFixed(2),
        negotiation.proposed_amount.toFixed(2),
        (((negotiation.original_amount - negotiation.proposed_amount) / negotiation.original_amount) * 100).toFixed(1) +
          "%",
        negotiation.installments + "x",
        negotiation.status,
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

      {/* Disclaimer */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          💡 Todos os dados exibidos são fictícios para demonstração. A plataforma está preparada para integração com
          dados reais e modelos de IA.
        </p>
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
