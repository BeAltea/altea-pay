"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TrendingUp, DollarSign, Users, Building2, Download, FileText, Calendar, Settings } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

interface CompanyReport {
  id: string
  name: string
  totalCustomers: number
  totalDebts: number
  totalAmount: number
  recoveredAmount: number
  recoveryRate: number
  overdueDebts: number
  monthlyGrowth: number
}

interface MonthlyData {
  month: string
  recovered: number
  target: number
  companies: number
  newDebts: number
}

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("current-month")
  const [reportData, setReportData] = useState<any>(null)
  const [isReportOpen, setIsReportOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [realData, setRealData] = useState<any>(null)

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const supabase = createBrowserClient()

        console.log("[v0] 📊 Carregando dados reais dos relatórios...")

        const { data: companies, error: companiesError } = await supabase.from("companies").select("id, name")

        if (companiesError) throw companiesError

        const { data: customers, error: customersError } = await supabase.from("customers").select(`
            id,
            company_id,
            companies (name)
          `)

        if (customersError) throw customersError

        const { data: vmaxCustomers, error: vmaxError } = await supabase.from("VMAX").select("id, Empresa")

        if (vmaxError) throw vmaxError

        const { data: debts, error: debtsError } = await supabase
          .from("debts")
          .select("id, customer_id, amount, status")

        if (debtsError) throw debtsError

        const { data: creditProfiles, error: profilesError } = await supabase.from("credit_profiles").select("*")

        if (profilesError) throw profilesError

        const totalCompanies = companies?.length || 0
        const totalCustomers = (customers?.length || 0) + (vmaxCustomers?.length || 0)
        const totalAmount = debts?.reduce((sum, debt) => sum + (debt.amount || 0), 0) || 0
        const paidDebts = debts?.filter((d) => d.status === "paid") || []
        const totalRecovered = paidDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0)

        const companiesReport = (companies || []).map((company: any) => {
          const companyCustomers = customers?.filter((c) => c.company_id === company.id) || []
          const companyDebts =
            debts?.filter((d) => {
              const customer = customers?.find((c) => c.id === d.customer_id)
              return customer?.company_id === company.id
            }) || []

          const companyAmount = companyDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0)
          const companyPaid = companyDebts.filter((d) => d.status === "paid")
          const companyRecovered = companyPaid.reduce((sum, debt) => sum + (debt.amount || 0), 0)
          const recoveryRate = companyAmount > 0 ? (companyRecovered / companyAmount) * 100 : 0

          return {
            id: company.id,
            name: company.name,
            totalCustomers: companyCustomers.length,
            totalDebts: companyDebts.length,
            totalAmount: companyAmount,
            recoveredAmount: companyRecovered,
            recoveryRate: recoveryRate,
            overdueDebts: companyDebts.filter((d) => d.status === "overdue").length,
            monthlyGrowth: 0,
          }
        })

        const data = {
          totalCompanies,
          totalCustomers,
          totalAmount,
          totalRecovered,
          companiesReport,
          totalDebts: debts?.length || 0,
        }

        console.log("[v0] ✅ Dados reais carregados:", data)
        setRealData(data)
      } catch (error) {
        console.error("[v0] ❌ Erro ao carregar dados reais:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRealData()
  }, [])

  const globalStats = realData
    ? {
        totalCompanies: realData.totalCompanies,
        totalCustomers: realData.totalCustomers,
        totalDebts: realData.totalDebts,
        totalAmount: realData.totalAmount,
        totalRecovered: realData.totalRecovered,
        totalOverdue:
          realData.companiesReport?.reduce((sum: number, company: any) => sum + company.overdueDebts, 0) || 0,
      }
    : {
        totalCompanies: 0,
        totalCustomers: 0,
        totalDebts: 0,
        totalAmount: 0,
        totalRecovered: 0,
        totalOverdue: 0,
      }

  const companiesReport = realData?.companiesReport || []
  const overallRecoveryRate =
    globalStats.totalAmount > 0 ? (globalStats.totalRecovered / globalStats.totalAmount) * 100 : 0

  const topPerformers = [...companiesReport].sort((a, b) => b.recoveryRate - a.recoveryRate).slice(0, 3)
  const bottomPerformers = [...companiesReport].sort((a, b) => a.recoveryRate - b.recoveryRate).slice(0, 3)

  const handleExportReport = () => {
    console.log("[v0] Exportando relatório global para o período:", selectedPeriod)

    const reportData = {
      period: selectedPeriod,
      globalStats,
      companiesReport,
      topPerformers,
      bottomPerformers,
      exportedAt: new Date().toISOString(),
    }

    const csvContent = `data:text/csv;charset=utf-8,Relatório Global - ${selectedPeriod}\\n\\nEstatísticas Globais:\\nTotal de Empresas,${globalStats.totalCompanies}\\nTotal de Clientes,${globalStats.totalCustomers}\\nVolume Total,R$ ${globalStats.totalAmount.toLocaleString("pt-BR")}\\nValor Recuperado,R$ ${globalStats.totalRecovered.toLocaleString("pt-BR")}\\nTaxa de Recuperação,${overallRecoveryRate.toFixed(1)}%\\n\\nExportado em: ${new Date().toLocaleString("pt-BR")}`

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `relatorio-global-${selectedPeriod}-${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    alert(`Relatório global exportado com sucesso para o período: ${selectedPeriod}!`)
  }

  const handleGenerateReport = (reportType: string) => {
    console.log("[v0] Gerando relatório do tipo:", reportType)

    const reportTypes = {
      monthly: {
        title: "Relatório Mensal",
        description: "Análise detalhada do desempenho mensal",
        data: {
          period: selectedPeriod,
          totalRecovered: globalStats.totalRecovered,
          targetRecovered: globalStats.totalAmount * 0.6,
          companiesAnalyzed: globalStats.totalCompanies,
          topPerformer: topPerformers[0],
          insights: [
            "Taxa de recuperação 12% acima do mês anterior",
            "Enel Distribuição mostrou maior crescimento",
            "Redução de 8% em dívidas em atraso",
            "Meta mensal atingida em 113%",
          ],
          recommendations: [
            "Aplicar estratégias da Enel nas outras empresas",
            "Focar em clientes com dívidas de 30-60 dias",
            "Implementar campanhas de negociação",
          ],
        },
      },
      trends: {
        title: "Análise de Tendências",
        description: "Identificação de padrões e tendências de recuperação",
        data: {
          trendDirection: "Crescimento",
          growthRate: 0, // Historical data not available
          seasonalPatterns: [
            "Pico de recuperação no final do mês",
            "Queda típica nos primeiros 10 dias",
            "Melhores resultados às terças e quartas",
          ],
          predictedNextMonth: globalStats.totalRecovered * 1.15,
          riskFactors: ["Aumento de 5% em inadimplentes crônicos", "Redução na taxa de contato telefônico"],
        },
      },
      companies: {
        title: "Relatório por Empresa",
        description: "Análise comparativa detalhada entre empresas",
        data: {
          companiesAnalyzed: globalStats.totalCompanies,
          bestPerformer: topPerformers[0],
          worstPerformer: bottomPerformers[0],
          averageRecoveryRate: overallRecoveryRate,
          companyComparison: companiesReport.map((company) => ({
            name: company.name,
            performance: company.recoveryRate > overallRecoveryRate ? "Acima da média" : "Abaixo da média",
            trend: company.monthlyGrowth > 0 ? "Crescimento" : "Declínio",
          })),
        },
      },
      custom: {
        title: "Relatório Personalizado",
        description: "Relatório customizado com métricas específicas",
        data: {
          customMetrics: [
            "Taxa de conversão por canal",
            "Tempo médio de recuperação",
            "Efetividade por faixa de valor",
            "Performance por região",
          ],
          dateRange: selectedPeriod,
          filters: "Todas as empresas ativas",
          specialAnalysis: "Análise de cohort de clientes",
        },
      },
    }

    const selectedReport = reportTypes[reportType as keyof typeof reportTypes]
    setReportData(selectedReport)
    setIsReportOpen(true)
  }

  const handlePeriodChange = (newPeriod: string) => {
    console.log("[v0] Mudando período para:", newPeriod)
    setSelectedPeriod(newPeriod)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando dados reais...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Relatórios Globais</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Análise consolidada de todas as empresas e operações de cobrança.
          </p>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Mês Atual</SelectItem>
              <SelectItem value="last-month">Mês Anterior</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportReport} variant="outline" className="flex items-center space-x-2 bg-transparent">
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Empresas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{globalStats.totalCompanies}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <span className="text-green-600">+2</span> novas este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Clientes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {globalStats.totalCustomers.toLocaleString("pt-BR")}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              <span className="text-green-600">+0%</span> vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Volume Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  R$ {globalStats.totalAmount.toLocaleString("pt-BR")}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Valor total em cobrança</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Valor Recuperado</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  R$ {globalStats.totalRecovered.toLocaleString("pt-BR")}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Taxa: <span className="text-green-600">{overallRecoveryRate.toFixed(1)}%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Gerar Relatórios</span>
          </CardTitle>
          <CardDescription>Selecione o tipo de relatório que deseja gerar com base nos dados atuais.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={() => handleGenerateReport("monthly")}
              variant="outline"
              className="h-20 flex-col space-y-2 bg-transparent"
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm">Relatório Mensal</span>
            </Button>

            <Button
              onClick={() => handleGenerateReport("trends")}
              variant="outline"
              className="h-20 flex-col space-y-2 bg-transparent"
            >
              <TrendingUp className="h-6 w-6" />
              <span className="text-sm">Análise de Tendência</span>
            </Button>

            <Button
              onClick={() => handleGenerateReport("companies")}
              variant="outline"
              className="h-20 flex-col space-y-2 bg-transparent"
            >
              <Building2 className="h-6 w-6" />
              <span className="text-sm">Por Empresa</span>
            </Button>

            <Button
              onClick={() => handleGenerateReport("custom")}
              variant="outline"
              className="h-20 flex-col space-y-2 bg-transparent"
            >
              <Settings className="h-6 w-6" />
              <span className="text-sm">Personalizado</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Top Performers</CardTitle>
            <CardDescription>Empresas com melhor desempenho no período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((company, index) => (
                <div
                  key={company.name}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{company.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {company.totalCustomers.toLocaleString("pt-BR")} clientes
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{company.recoveryRate.toFixed(1)}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      R$ {company.recoveredAmount.toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Needs Attention</CardTitle>
            <CardDescription>Empresas que precisam de atenção especial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bottomPerformers.map((company, index) => (
                <div
                  key={company.name}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{company.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {company.totalCustomers.toLocaleString("pt-BR")} clientes
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{company.recoveryRate.toFixed(1)}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      R$ {company.recoveredAmount.toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{reportData?.title}</span>
            </DialogTitle>
            <DialogDescription>{reportData?.description}</DialogDescription>
          </DialogHeader>

          {reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(reportData.data).map(([key, value]) => (
                  <div key={key} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white capitalize mb-2">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </h4>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {Array.isArray(value) ? (
                        <ul className="list-disc list-inside space-y-1">
                          {value.map((item, index) => (
                            <li key={index}>{typeof item === "object" ? JSON.stringify(item) : item}</li>
                          ))}
                        </ul>
                      ) : typeof value === "object" ? (
                        <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
                      ) : (
                        <p>{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsReportOpen(false)}>
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    const reportContent = `${reportData.title}\n\n${reportData.description}\n\n${JSON.stringify(reportData.data, null, 2)}`
                    const blob = new Blob([reportContent], { type: "text/plain" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `${reportData.title.toLowerCase().replace(/\s+/g, "-")}.txt`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Relatório
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
