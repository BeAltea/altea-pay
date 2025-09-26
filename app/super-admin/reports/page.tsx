"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  Download,
  FileText,
  PieChart,
  Activity,
} from "lucide-react"

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

  const getDataForPeriod = (period: string) => {
    const baseData = {
      "current-month": {
        totalAmount: 6724336.46,
        totalRecovered: 3308643.95,
        totalDebts: 8835,
        totalCustomers: 3336,
        monthlyGrowth: 12.5,
        companiesReport: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            name: "Enel Distribuição São Paulo",
            totalCustomers: 1247,
            totalDebts: 3456,
            totalAmount: 2847392.5,
            recoveredAmount: 1234567.89,
            recoveryRate: 43.4,
            overdueDebts: 234,
            monthlyGrowth: 12.5,
          },
          {
            id: "22222222-2222-2222-2222-222222222222",
            name: "Sabesp - Companhia de Saneamento",
            totalCustomers: 892,
            totalDebts: 2134,
            totalAmount: 1654321.75,
            recoveredAmount: 876543.21,
            recoveryRate: 53.0,
            overdueDebts: 156,
            monthlyGrowth: 8.3,
          },
          {
            id: "33333333-3333-3333-3333-333333333333",
            name: "CPFL Energia",
            totalCustomers: 654,
            totalDebts: 1789,
            totalAmount: 1234567.89,
            recoveredAmount: 654321.98,
            recoveryRate: 53.0,
            overdueDebts: 98,
            monthlyGrowth: -2.1,
          },
          {
            id: "44444444-4444-4444-4444-444444444444",
            name: "Cemig Distribuição",
            totalCustomers: 543,
            totalDebts: 1456,
            totalAmount: 987654.32,
            recoveredAmount: 543210.87,
            recoveryRate: 55.0,
            overdueDebts: 87,
            monthlyGrowth: 15.7,
          },
        ],
        monthlyData: [
          { month: "Jan", recovered: 450000, target: 500000, companies: 3, newDebts: 1200 },
          { month: "Fev", recovered: 520000, target: 550000, companies: 4, newDebts: 1350 },
          { month: "Mar", recovered: 680000, target: 600000, companies: 4, newDebts: 1500 },
        ]
      },
      "last-month": {
        totalAmount: 5892445.23,
        totalRecovered: 2946222.61,
        totalDebts: 7654,
        totalCustomers: 2987,
        monthlyGrowth: 8.7,
        companiesReport: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            name: "Enel Distribuição São Paulo",
            totalCustomers: 1156,
            totalDebts: 3123,
            totalAmount: 2456789.12,
            recoveredAmount: 1123456.78,
            recoveryRate: 45.7,
            overdueDebts: 198,
            monthlyGrowth: 9.2,
          },
          {
            id: "22222222-2222-2222-2222-222222222222",
            name: "Sabesp - Companhia de Saneamento",
            totalCustomers: 823,
            totalDebts: 1987,
            totalAmount: 1456789.23,
            recoveredAmount: 789123.45,
            recoveryRate: 54.2,
            overdueDebts: 134,
            monthlyGrowth: 7.8,
          },
          {
            id: "33333333-3333-3333-3333-333333333333",
            name: "CPFL Energia",
            totalCustomers: 598,
            totalDebts: 1654,
            totalAmount: 1098765.43,
            recoveredAmount: 587432.10,
            recoveryRate: 53.5,
            overdueDebts: 87,
            monthlyGrowth: 6.4,
          },
          {
            id: "44444444-4444-4444-4444-444444444444",
            name: "Cemig Distribuição",
            totalCustomers: 410,
            totalDebts: 890,
            totalAmount: 880101.45,
            recoveredAmount: 446210.28,
            recoveryRate: 50.7,
            overdueDebts: 65,
            monthlyGrowth: 12.1,
          },
        ],
        monthlyData: [
          { month: "Dez", recovered: 380000, target: 450000, companies: 3, newDebts: 1100 },
          { month: "Jan", recovered: 420000, target: 480000, companies: 4, newDebts: 1250 },
          { month: "Fev", recovered: 580000, target: 520000, companies: 4, newDebts: 1400 },
        ]
      }
    }
    
    return baseData[period as keyof typeof baseData] || baseData["current-month"]
  }

  const currentData = getDataForPeriod(selectedPeriod)
  const companiesReport = currentData.companiesReport
  const monthlyData = currentData.monthlyData

  const globalStats = {
    totalCompanies: companiesReport.length,
    totalCustomers: currentData.totalCustomers,
    totalDebts: currentData.totalDebts,
    totalAmount: currentData.totalAmount,
    totalRecovered: currentData.totalRecovered,
    totalOverdue: companiesReport.reduce((sum: number, company: any) => sum + company.overdueDebts, 0),
  }

  const overallRecoveryRate = (globalStats.totalRecovered / globalStats.totalAmount) * 100

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
            "Meta mensal atingida em 113%"
          ],
          recommendations: [
            "Aplicar estratégias da Enel nas outras empresas",
            "Focar em clientes com dívidas de 30-60 dias",
            "Implementar campanhas de negociação"
          ]
        }
      },
      trends: {
        title: "Análise de Tendências",
        description: "Identificação de padrões e tendências de recuperação",
        data: {
          trendDirection: "Crescimento",
          growthRate: currentData.monthlyGrowth,
          seasonalPatterns: [
            "Pico de recuperação no final do mês",
            "Queda típica nos primeiros 10 dias",
            "Melhores resultados às terças e quartas"
          ],
          predictedNextMonth: globalStats.totalRecovered * 1.15,
          riskFactors: [
            "Aumento de 5% em inadimplentes crônicos",
            "Redução na taxa de contato telefônico"
          ]
        }
      },
      companies: {
        title: "Relatório por Empresa",
        description: "Análise comparativa detalhada entre empresas",
        data: {
          companiesAnalyzed: globalStats.totalCompanies,
          bestPerformer: topPerformers[0],
          worstPerformer: bottomPerformers[0],
          averageRecoveryRate: overallRecoveryRate,
          companyComparison: companiesReport.map(company => ({
            name: company.name,
            performance: company.recoveryRate > overallRecoveryRate ? "Acima da média" : "Abaixo da média",
            trend: company.monthlyGrowth > 0 ? "Crescimento" : "Declínio"
          }))
        }
      },
      custom: {
        title: "Relatório Personalizado",
        description: "Relatório customizado com métricas específicas",
        data: {
          customMetrics: [
            "Taxa de conversão por canal",
            "Tempo médio de recuperação",
            "Efetividade por faixa de valor",
            "Performance por região"
          ],
          dateRange: selectedPeriod,
          filters: "Todas as empresas ativas",
          specialAnalysis: "Análise de cohort de clientes"
        }
      }
    }

    const selectedReport = reportTypes[reportType as keyof typeof reportTypes]
    setReportData(selectedReport)
    setIsReportOpen(true)
  }

  const handlePeriodChange = (newPeriod: string) => {
    console.log("[v0] Mudando período para:", newPeriod)
    setSelectedPeriod(newPeriod)
    // Data will automatically update due to reactive getDataForPeriod call
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Relatórios Globais</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Análise consolidada de todas as empresas e operações de cobrança.
          </p>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Mês Atual</SelectItem>
              <SelectItem value="last-month">Mês Anterior</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Global Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {(globalStats.totalAmount / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{currentData.monthlyGrowth}% vs período anterior
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Recuperado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {(globalStats.totalRecovered / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">{overallRecoveryRate.toFixed(1)}% de taxa de recuperação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Dívidas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.totalDebts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{globalStats.totalOverdue.toLocaleString()} em atraso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{globalStats.totalCompanies} empresas ativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Performance do Período</span>
            </CardTitle>
            <CardDescription>Comparativo de recuperação vs meta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((data, index) => (
                <div key={data.month} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{data.month} 2024</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      R$ {(data.recovered / 1000).toFixed(0)}k / R$ {(data.target / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <Progress value={(data.recovered / data.target) * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Meta: R$ {(data.target / 1000).toFixed(0)}k</span>
                    <span className={data.recovered >= data.target ? "text-green-600" : "text-orange-600"}>
                      {((data.recovered / data.target) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recovery Rate Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Distribuição por Faixa de Recuperação</span>
            </CardTitle>
            <CardDescription>Empresas agrupadas por performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">Excelente (&gt;50%)</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">3 empresas</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">75% do total</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium">Bom (30-50%)</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">1 empresa</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">25% do total</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium">Precisa Atenção (&lt;30%)</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">0 empresas</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">0% do total</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <span>Performance por Empresa</span>
          </CardTitle>
          <CardDescription>Comparativo detalhado de todas as empresas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {companiesReport.map((company) => (
              <div
                key={company.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">{company.name}</h3>
                    {company.monthlyGrowth > 0 ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                        <TrendingUp className="h-3 w-3 mr-1" />+{company.monthlyGrowth.toFixed(1)}%
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        {company.monthlyGrowth.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Clientes</p>
                      <p className="font-medium">{company.totalCustomers.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Volume</p>
                      <p className="font-medium">R$ {(company.totalAmount / 1000).toFixed(0)}k</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Recuperado</p>
                      <p className="font-medium text-green-600">R$ {(company.recoveredAmount / 1000).toFixed(0)}k</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Taxa</p>
                      <p className="font-medium">{company.recoveryRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 lg:mt-0 lg:ml-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-32">
                      <Progress value={company.recoveryRate} className="h-2" />
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/super-admin/companies/${company.id}`}>Ver Detalhes</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top and Bottom Performers */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-green-700 dark:text-green-400">
              <TrendingUp className="h-5 w-5" />
              <span>Melhores Performances</span>
            </CardTitle>
            <CardDescription>Empresas com maior taxa de recuperação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((company, index) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{company.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        R$ {(company.recoveredAmount / 1000).toFixed(0)}k recuperados
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{company.recoveryRate.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-700 dark:text-orange-400">
              <TrendingDown className="h-5 w-5" />
              <span>Precisam de Atenção</span>
            </CardTitle>
            <CardDescription>Empresas com menor taxa de recuperação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottomPerformers.map((company, index) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{company.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {company.overdueDebts} dívidas em atraso
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">{company.recoveryRate.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Relatórios Disponíveis</span>
          </CardTitle>
          <CardDescription>Gere relatórios detalhados para análise</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-20 flex-col space-y-2 bg-transparent"
                  onClick={() => handleGenerateReport("monthly")}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm">Relatório Mensal</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{reportData?.title}</DialogTitle>
                  <DialogDescription>{reportData?.description}</DialogDescription>
                </DialogHeader>
                {reportData && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">Valor Recuperado</h4>
                        <p className="text-2xl font-bold text-blue-600">
                          R$ {(reportData.data.totalRecovered / 1000000).toFixed(1)}M
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <h4 className="font-medium text-green-900 dark:text-green-100">Meta Atingida</h4>
                        <p className="text-2xl font-bold text-green-600">
                          {((reportData.data.totalRecovered / reportData.data.targetRecovered) * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    
                    {reportData.data.insights && (
                      <div>
                        <h4 className="font-medium mb-2">Principais Insights</h4>
                        <ul className="space-y-1">
                          {reportData.data.insights.map((insight: string, index: number) => (
                            <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {reportData.data.recommendations && (
                      <div>
                        <h4 className="font-medium mb-2">Recomendações</h4>
                        <ul className="space-y-1">
                          {reportData.data.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 bg-transparent"
              onClick={() => handleGenerateReport("trends")}
            >
              <TrendingUp className="h-6 w-6" />
              <span className="text-sm">Análise de Tendências</span>
            </Button>

            <Button
              variant="outline"\
