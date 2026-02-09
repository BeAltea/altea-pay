"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Send,
  Mail,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"

interface Company {
  id: string
  name: string
}

interface VmaxRecord {
  id: string
  id_company: string
  Vencido: string
  "CPF/CNPJ": string
  "Dias Inad.": string | number
  negotiation_status?: string
  Cliente?: string
}

interface Agreement {
  id: string
  customer_id: string
  company_id: string
  status: string
  asaas_status?: string
  agreed_amount?: number
  created_at: string
}

interface MonthlyData {
  month: string
  label: string
  received: number
  debt: number
}

interface CompanyStats {
  id: string
  name: string
  clients: number
  totalDebt: number
  received: number
  recoveryRate: number
  negSent: number
  negPaid: number
}

// Format currency in BRL
function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Format compact currency
function formatCompactBRL(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`
  }
  return formatBRL(value)
}

// Parse VMAX currency value
function parseVencido(v: VmaxRecord): number {
  const vencidoStr = String(v.Vencido || "0")
  const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  return Number(cleanValue) || 0
}

// Check if VMAX record is paid
function isPaid(v: VmaxRecord, paidDocs: Set<string>): boolean {
  const doc = (v["CPF/CNPJ"] || "").replace(/\D/g, "")
  return paidDocs.has(doc) || v.negotiation_status === "PAGO"
}

export default function ReportsPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<"12" | "24">("12")
  const [loading, setLoading] = useState(true)

  // Data state
  const [companies, setCompanies] = useState<Company[]>([])
  const [vmaxData, setVmaxData] = useState<VmaxRecord[]>([])
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [paidDocsByCompany, setPaidDocsByCompany] = useState<Map<string, Set<string>>>(new Map())
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createBrowserClient()
        console.log("[Reports] Loading data...")

        // Fetch companies
        const { data: companiesData } = await supabase
          .from("companies")
          .select("id, name")
          .order("name")

        setCompanies(companiesData || [])

        // Fetch VMAX data with pagination
        let allVmax: VmaxRecord[] = []
        let page = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
          const { data: vmaxPage } = await supabase
            .from("VMAX")
            .select('id, id_company, Vencido, "CPF/CNPJ", "Dias Inad.", negotiation_status, Cliente')
            .range(page * pageSize, (page + 1) * pageSize - 1)

          if (vmaxPage && vmaxPage.length > 0) {
            allVmax = [...allVmax, ...vmaxPage]
            page++
            hasMore = vmaxPage.length === pageSize
          } else {
            hasMore = false
          }
        }
        setVmaxData(allVmax)
        console.log("[Reports] VMAX loaded:", allVmax.length)

        // Fetch agreements with pagination
        let allAgreements: Agreement[] = []
        page = 0
        hasMore = true

        while (hasMore) {
          const { data: agreementsPage } = await supabase
            .from("agreements")
            .select("id, customer_id, company_id, status, asaas_status, agreed_amount, created_at")
            .range(page * pageSize, (page + 1) * pageSize - 1)

          if (agreementsPage && agreementsPage.length > 0) {
            allAgreements = [...allAgreements, ...agreementsPage]
            page++
            hasMore = agreementsPage.length === pageSize
          } else {
            hasMore = false
          }
        }
        setAgreements(allAgreements)
        console.log("[Reports] Agreements loaded:", allAgreements.length)

        // Fetch customers for document mapping
        const { data: customers } = await supabase
          .from("customers")
          .select("id, document, company_id")

        // Build paid documents map
        const customerIdToDoc = new Map<string, string>()
        for (const c of customers || []) {
          if (c.document) {
            customerIdToDoc.set(c.id, c.document.replace(/\D/g, ""))
          }
        }

        const paidDocsMap = new Map<string, Set<string>>()
        for (const a of allAgreements) {
          if (a.status === "completed" || a.status === "paid") {
            const doc = customerIdToDoc.get(a.customer_id)
            if (doc && a.company_id) {
              if (!paidDocsMap.has(a.company_id)) {
                paidDocsMap.set(a.company_id, new Set())
              }
              paidDocsMap.get(a.company_id)!.add(doc)
            }
          }
        }
        setPaidDocsByCompany(paidDocsMap)

        // Generate monthly data for chart
        const months = generateMonthlyChartData(allAgreements, allVmax, 24)
        setMonthlyData(months)

      } catch (error) {
        console.error("[Reports] Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Generate monthly chart data
  function generateMonthlyChartData(
    allAgreements: Agreement[],
    allVmax: VmaxRecord[],
    monthsCount: number
  ): MonthlyData[] {
    const data: MonthlyData[] = []
    const now = new Date()

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "")

      // Calculate received amount for this month (from completed agreements)
      const monthReceived = allAgreements
        .filter((a) => {
          if (a.status !== "completed" && a.status !== "paid") return false
          const aDate = new Date(a.created_at)
          return (
            aDate.getFullYear() === date.getFullYear() &&
            aDate.getMonth() === date.getMonth()
          )
        })
        .reduce((sum, a) => sum + (a.agreed_amount || 0), 0)

      // Estimate debt for this month (simplified - total divided by months)
      const totalDebt = allVmax.reduce((sum, v) => sum + parseVencido(v), 0)
      const monthDebt = totalDebt / monthsCount

      data.push({
        month: monthKey,
        label,
        received: monthReceived,
        debt: monthDebt,
      })
    }

    return data
  }

  // Calculate metrics based on selected company
  const metrics = useMemo(() => {
    const companyFilter = selectedCompanyId === "all"
      ? null
      : selectedCompanyId

    // Filter VMAX data
    const filteredVmax = companyFilter
      ? vmaxData.filter((v) => v.id_company === companyFilter)
      : vmaxData

    // Filter agreements
    const filteredAgreements = companyFilter
      ? agreements.filter((a) => a.company_id === companyFilter)
      : agreements

    // Get paid docs for filtered companies
    const getPaidDocs = (companyId: string): Set<string> => {
      return paidDocsByCompany.get(companyId) || new Set()
    }

    // Calculate metrics
    const uniqueCompanies = new Set(filteredVmax.map((v) => v.id_company))
    const uniqueClients = new Set(filteredVmax.map((v) => v["CPF/CNPJ"]?.replace(/\D/g, "")))

    let totalDebt = 0
    let totalReceived = 0

    filteredVmax.forEach((v) => {
      const amount = parseVencido(v)
      const companyPaidDocs = getPaidDocs(v.id_company)
      if (isPaid(v, companyPaidDocs)) {
        totalReceived += amount
      } else {
        totalDebt += amount
      }
    })

    const totalOriginal = totalDebt + totalReceived
    const recoveryRate = totalOriginal > 0 ? (totalReceived / totalOriginal) * 100 : 0

    // Negotiations metrics
    const negSent = filteredAgreements.filter(
      (a) => ["active", "pending", "draft"].includes(a.status)
    ).length

    const negOpened = filteredAgreements.filter(
      (a) => a.asaas_status && ["PENDING", "RECEIVED", "CONFIRMED"].includes(a.asaas_status)
    ).length

    const negPaid = filteredAgreements.filter(
      (a) => a.status === "completed" || a.status === "paid"
    ).length

    const negPaidRate = negSent > 0 ? (negPaid / negSent) * 100 : 0

    return {
      empresasAtivas: companyFilter ? 1 : uniqueCompanies.size,
      totalClientes: uniqueClients.size,
      dividaTotal: totalDebt,
      totalRecebido: totalReceived,
      recuperacao: recoveryRate,
      negEnviadas: negSent,
      negAbertas: negOpened,
      negPagasRate: negPaidRate,
    }
  }, [selectedCompanyId, vmaxData, agreements, paidDocsByCompany])

  // Calculate per-company stats
  const companyStats = useMemo((): CompanyStats[] => {
    return companies.map((company) => {
      const companyVmax = vmaxData.filter((v) => v.id_company === company.id)
      const companyAgreements = agreements.filter((a) => a.company_id === company.id)
      const companyPaidDocs = paidDocsByCompany.get(company.id) || new Set<string>()

      const uniqueClients = new Set(companyVmax.map((v) => v["CPF/CNPJ"]?.replace(/\D/g, "")))

      let debt = 0
      let received = 0
      companyVmax.forEach((v) => {
        const amount = parseVencido(v)
        if (isPaid(v, companyPaidDocs)) {
          received += amount
        } else {
          debt += amount
        }
      })

      const total = debt + received
      const rate = total > 0 ? (received / total) * 100 : 0

      const negSent = companyAgreements.filter(
        (a) => ["active", "pending", "draft"].includes(a.status)
      ).length

      const negPaid = companyAgreements.filter(
        (a) => a.status === "completed" || a.status === "paid"
      ).length

      return {
        id: company.id,
        name: company.name,
        clients: uniqueClients.size,
        totalDebt: debt,
        received,
        recoveryRate: rate,
        negSent,
        negPaid,
      }
    }).sort((a, b) => b.recoveryRate - a.recoveryRate)
  }, [companies, vmaxData, agreements, paidDocsByCompany])

  // Filter chart data by time range
  const chartData = useMemo(() => {
    const count = timeRange === "12" ? 12 : 24
    return monthlyData.slice(-count)
  }, [monthlyData, timeRange])

  // Handle company row click
  const handleCompanyClick = (companyId: string) => {
    setSelectedCompanyId(companyId)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Relatórios Globais</h1>
          <p className="text-muted-foreground mt-1">Carregando dados...</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Relatórios Globais</h1>
          <p className="text-muted-foreground mt-1">
            Análise consolidada de todas as empresas e operações de cobrança.
          </p>
        </div>
      </div>

      {/* SECTION 1: Live Overview Cards */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Visão Geral ao Vivo
              </CardTitle>
              <CardDescription>Métricas em tempo real baseadas nos dados atuais</CardDescription>
            </div>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar por empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Empresas</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1: Empresas Ativas */}
            {selectedCompanyId === "all" && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        Empresas Ativas
                      </p>
                      <p className="text-2xl font-bold mt-1">{metrics.empresasAtivas}</p>
                    </div>
                    <Building2 className="h-8 w-8 text-blue-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card 2: Total de Clientes */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Total de Clientes
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {metrics.totalClientes.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-green-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Dívida Total */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Dívida Total
                    </p>
                    <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                      {formatCompactBRL(metrics.dividaTotal)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-red-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Total Recebido */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Total Recebido
                    </p>
                    <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                      {formatCompactBRL(metrics.totalRecebido)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            {/* Card 5: % Recuperação */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      % Recuperação
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {metrics.recuperacao.toFixed(1)}%
                    </p>
                  </div>
                  <Percent className="h-8 w-8 text-purple-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            {/* Card 6: Negociações Enviadas */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Neg. Enviadas
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {metrics.negEnviadas.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Send className="h-8 w-8 text-orange-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            {/* Card 7: Negociações Abertas */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Neg. Abertas
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {metrics.negAbertas.toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <Mail className="h-8 w-8 text-yellow-500 opacity-80" />
                </div>
              </CardContent>
            </Card>

            {/* Card 8: % Negociações Pagas */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      % Neg. Pagas
                    </p>
                    <p className="text-2xl font-bold mt-1">
                      {metrics.negPagasRate.toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-500 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Trend Graph */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Tendência de Recuperação</CardTitle>
              <CardDescription>Evolução mensal de valores recebidos vs dívida total</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={timeRange === "12" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("12")}
              >
                12 Meses
              </Button>
              <Button
                variant={timeRange === "24" ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange("24")}
              >
                24 Meses
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => formatCompactBRL(value)}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatBRL(value),
                    name === "received" ? "Total Recebido" : "Dívida Total",
                  ]}
                  labelFormatter={(label) => `Mês: ${label}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === "received" ? "Total Recebido" : "Dívida Total"
                  }
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReceived)"
                />
                <Area
                  type="monotone"
                  dataKey="debt"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDebt)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: Company Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Desempenho por Empresa</CardTitle>
          <CardDescription>
            Clique em uma linha para filtrar os dados acima por essa empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Empresa</th>
                    <th className="text-right p-3 font-medium">Clientes</th>
                    <th className="text-right p-3 font-medium">Dívida Total</th>
                    <th className="text-right p-3 font-medium">Recebido</th>
                    <th className="text-right p-3 font-medium">% Recuperação</th>
                    <th className="text-right p-3 font-medium">Neg. Enviadas</th>
                    <th className="text-right p-3 font-medium">Neg. Pagas</th>
                  </tr>
                </thead>
                <tbody>
                  {companyStats.map((company) => (
                    <tr
                      key={company.id}
                      className={`border-t hover:bg-muted/50 cursor-pointer transition-colors ${
                        selectedCompanyId === company.id ? "bg-muted" : ""
                      }`}
                      onClick={() => handleCompanyClick(company.id)}
                    >
                      <td className="p-3 font-medium">{company.name}</td>
                      <td className="p-3 text-right">
                        {company.clients.toLocaleString("pt-BR")}
                      </td>
                      <td className="p-3 text-right text-red-600 dark:text-red-400">
                        {formatCompactBRL(company.totalDebt)}
                      </td>
                      <td className="p-3 text-right text-green-600 dark:text-green-400">
                        {formatCompactBRL(company.received)}
                      </td>
                      <td className="p-3 text-right">
                        <Badge
                          variant={company.recoveryRate >= 50 ? "default" : "secondary"}
                          className={
                            company.recoveryRate >= 50
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : ""
                          }
                        >
                          {company.recoveryRate.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{company.negSent}</td>
                      <td className="p-3 text-right">{company.negPaid}</td>
                    </tr>
                  ))}
                  {companyStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        Nenhuma empresa encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
