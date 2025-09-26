"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  Download,
  Calendar,
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

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("current-month")

  // Mock data for reports
  const companiesReport: CompanyReport[] = [
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
  ]

  const globalStats = {
    totalCompanies: companiesReport.length,
    totalCustomers: companiesReport.reduce((sum, company) => sum + company.totalCustomers, 0),
    totalDebts: companiesReport.reduce((sum, company) => sum + company.totalDebts, 0),
    totalAmount: companiesReport.reduce((sum, company) => sum + company.totalAmount, 0),
    totalRecovered: companiesReport.reduce((sum, company) => sum + company.recoveredAmount, 0),
    totalOverdue: companiesReport.reduce((sum, company) => sum + company.overdueDebts, 0),
  }

  const overallRecoveryRate = (globalStats.totalRecovered / globalStats.totalAmount) * 100

  const monthlyData = [
    { month: "Jan", recovered: 450000, target: 500000 },
    { month: "Fev", recovered: 520000, target: 550000 },
    { month: "Mar", recovered: 680000, target: 600000 },
  ]

  const topPerformers = companiesReport.sort((a, b) => b.recoveryRate - a.recoveryRate).slice(0, 3)

  const bottomPerformers = companiesReport.sort((a, b) => a.recoveryRate - b.recoveryRate).slice(0, 3)

  const handleExportReport = () => {
    console.log("[v0] Exportando relatório global para o período:", selectedPeriod)

    // Create comprehensive report data
    const reportData = {
      period: selectedPeriod,
      globalStats,
      companiesReport,
      topPerformers,
      bottomPerformers,
      exportedAt: new Date().toISOString(),
    }

    // Create and download CSV
    const csvContent = `data:text/csv;charset=utf-8,Relatório Global - ${selectedPeriod}\n\nEstatísticas Globais:\nTotal de Empresas,${globalStats.totalCompanies}\nTotal de Clientes,${globalStats.totalCustomers}\nVolume Total,R$ ${globalStats.totalAmount.toLocaleString("pt-BR")}\nValor Recuperado,R$ ${globalStats.totalRecovered.toLocaleString("pt-BR")}\nTaxa de Recuperação,${overallRecoveryRate.toFixed(1)}%\n\nExportado em: ${new Date().toLocaleString("pt-BR")}`

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
      monthly: "Relatório Mensal",
      trends: "Análise de Tendências",
      companies: "Relatório por Empresa",
      custom: "Relatório Personalizado",
    }

    alert(`Gerando ${reportTypes[reportType as keyof typeof reportTypes]}...`)
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
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
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
                +12.5% vs mês anterior
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
              <span>Performance Mensal</span>
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
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 bg-transparent"
              onClick={() => handleGenerateReport("monthly")}
            >
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm">Relatório Mensal</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 bg-transparent"
              onClick={() => handleGenerateReport("trends")}
            >
              <TrendingUp className="h-6 w-6" />
              <span className="text-sm">Análise de Tendências</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 bg-transparent"
              onClick={() => handleGenerateReport("companies")}
            >
              <Building2 className="h-6 w-6" />
              <span className="text-sm">Por Empresa</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col space-y-2 bg-transparent"
              onClick={() => handleGenerateReport("custom")}
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm">Personalizado</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
