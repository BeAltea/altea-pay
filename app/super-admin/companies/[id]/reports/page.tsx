import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  FileText,
  ArrowLeft,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Clock,
  BarChart3,
} from "lucide-react"

interface CompanyReportsProps {
  params: Promise<{
    id: string
  }>
}

export default async function CompanyReportsPage({ params }: CompanyReportsProps) {
  const { id } = await params
  const supabase = createAdminClient()

  // Fetch company data
  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single()

  if (companyError || !companyData) {
    console.error("[v0] Error fetching company:", companyError)
    notFound()
  }

  // Fetch VMAX data for this company with pagination
  let vmaxData: any[] = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data: vmaxPage, error: vmaxPageError } = await supabase
      .from("VMAX")
      .select("*")
      .eq("id_company", id)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (vmaxPageError) {
      console.log("[v0] VMAX page error:", vmaxPageError.message)
      break
    }

    if (vmaxPage && vmaxPage.length > 0) {
      vmaxData = [...vmaxData, ...vmaxPage]
      page++
      hasMore = vmaxPage.length === pageSize
    } else {
      hasMore = false
    }
  }

  // Fetch completed agreements for recovery calculation
  const { data: completedAgreements } = await supabase
    .from("agreements")
    .select("id, agreed_amount, customer_id")
    .eq("company_id", id)
    .eq("status", "completed")

  // Get customers for document mapping
  const { data: customers } = await supabase
    .from("customers")
    .select("id, document")
    .eq("company_id", id)

  // Build customer -> document map
  const customerIdToDoc = new Map<string, string>()
  for (const c of customers || []) {
    if (c.document) {
      customerIdToDoc.set(c.id, c.document.replace(/\D/g, ""))
    }
  }

  // Get documents with paid agreements
  const paidDocs = new Set<string>()
  for (const a of completedAgreements || []) {
    const doc = customerIdToDoc.get(a.customer_id)
    if (doc) paidDocs.add(doc)
  }

  // Also check VMAX negotiation_status for PAGO
  for (const v of vmaxData || []) {
    if (v.negotiation_status === "PAGO") {
      const doc = (v["CPF/CNPJ"] || "").replace(/\D/g, "")
      if (doc) paidDocs.add(doc)
    }
  }

  // Helper functions
  const isPaid = (v: any) => {
    const doc = (v["CPF/CNPJ"] || "").replace(/\D/g, "")
    return paidDocs.has(doc) || v.negotiation_status === "PAGO"
  }

  const parseVencido = (v: any) => {
    const vencidoStr = String(v.Vencido || "0")
    const cleanValue = vencidoStr
      .replace(/R\$/g, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
    return Number(cleanValue) || 0
  }

  // Calculate KPIs
  const totalCustomers = vmaxData.length
  const totalDebts = vmaxData.filter((v) => !isPaid(v)).length

  const vmaxPendingAmount = vmaxData
    .filter((v) => !isPaid(v))
    .reduce((sum, v) => sum + parseVencido(v), 0)

  const vmaxRecoveredAmount = vmaxData
    .filter((v) => isPaid(v))
    .reduce((sum, v) => sum + parseVencido(v), 0)

  const totalOriginalAmount = vmaxPendingAmount + vmaxRecoveredAmount
  const recoveryRate = totalOriginalAmount > 0 ? (vmaxRecoveredAmount / totalOriginalAmount) * 100 : 0

  // Count by status
  const aprovados = vmaxData.filter((v) => v.approval_status === "ACEITA").length
  const rejeitados = vmaxData.filter((v) => v.approval_status === "REJEITA").length
  const pendentes = vmaxData.filter((v) => !v.approval_status || v.approval_status === "PENDENTE").length

  // Calculate overdue
  const overdueCustomers = vmaxData.filter((v) => {
    if (isPaid(v)) return false
    const diasInadStr = String(v["Dias Inad."] || "0")
    const diasInad = Number(diasInadStr.replace(/\./g, "")) || 0
    return diasInad > 0
  }).length

  // Calculate average score
  const scoresValidos = vmaxData
    .map((c) => c.credit_score)
    .filter((s) => s && s > 0)
  const averageScore = scoresValidos.length > 0
    ? scoresValidos.reduce((sum, s) => sum + s, 0) / scoresValidos.length
    : 0

  // Days overdue distribution
  const daysOverdueData = vmaxData.map((v) => {
    const diasStr = String(v["Dias Inad."] || "0")
    return Number(diasStr.replace(/\./g, "")) || 0
  })
  const avgDaysOverdue = daysOverdueData.length > 0
    ? daysOverdueData.reduce((sum, days) => sum + days, 0) / daysOverdueData.length
    : 0

  const debts0to30 = daysOverdueData.filter((d) => d >= 0 && d <= 30).length
  const debts31to60 = daysOverdueData.filter((d) => d > 30 && d <= 60).length
  const debts61to90 = daysOverdueData.filter((d) => d > 60 && d <= 90).length
  const debtsOver90 = daysOverdueData.filter((d) => d > 90).length

  const reportData = {
    company: {
      id: companyData.id,
      name: companyData.name,
    },
    performance: {
      totalCustomers,
      totalDebts,
      totalAmount: vmaxPendingAmount,
      recoveredAmount: vmaxRecoveredAmount,
      recoveryRate,
      averageScore,
      avgDaysOverdue,
    },
    status: {
      aprovados,
      rejeitados,
      pendentes,
      overdueCustomers,
    },
    distribution: {
      debts0to30,
      debts31to60,
      debts61to90,
      debtsOver90,
    },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={companyData.logo_url || ""} alt={companyData.name} />
            <AvatarFallback className="bg-altea-gold/10 text-altea-navy text-lg">
              {companyData.name
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Relatórios da Empresa</h1>
            <p className="text-gray-600 dark:text-gray-400">{companyData.name}</p>
          </div>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild variant="outline">
            <Link href={`/super-admin/companies/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{overdueCustomers} inadimplentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume em Cobrança</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vmaxPendingAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <p className="text-xs text-muted-foreground">{totalDebts} dívidas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recuperação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{recoveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {vmaxRecoveredAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} recuperado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Análise restritiva</p>
          </CardContent>
        </Card>
      </div>

      {/* Status de Análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status de Análises</CardTitle>
            <CardDescription>Distribuição de aprovações e rejeições</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Aprovados</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status: ACEITA</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600">{aprovados}</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Rejeitados</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status: REJEITA</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-600">{rejeitados}</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Inadimplentes</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Com débitos vencidos</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-orange-600">{overdueCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Financeiro</CardTitle>
            <CardDescription>Visão geral dos valores em cobrança</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total em Cobrança</span>
                  <span className="text-lg font-bold text-red-600">
                    {vmaxPendingAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-red-600 h-2 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Valor Recuperado</span>
                  <span className="text-lg font-bold text-green-600">
                    {vmaxRecoveredAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${recoveryRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Taxa de Aprovação</p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalCustomers > 0 ? ((aprovados / totalCustomers) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de Atrasos */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Atrasos</CardTitle>
          <CardDescription>Classificação por dias de inadimplência</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">0-30 dias</span>
              </div>
              <span className="text-lg font-bold">{debts0to30}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm font-medium">31-60 dias</span>
              </div>
              <span className="text-lg font-bold">{debts31to60}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-sm font-medium">61-90 dias</span>
              </div>
              <span className="text-lg font-bold">{debts61to90}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium">+90 dias</span>
              </div>
              <span className="text-lg font-bold">{debtsOver90}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info about real data */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">Dados Reais do Sistema</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Todos os dados exibidos nesta página são provenientes do banco de dados real do sistema,
                refletindo as análises restritivas realizadas via Assertiva e o status atual de cada cliente
                da empresa {companyData.name}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
