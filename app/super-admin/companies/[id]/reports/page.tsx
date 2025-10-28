"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import {
  FileText,
  ArrowLeft,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
} from "lucide-react"

export default function CompanyReportsPage({ params }: { params: { id: string } }) {
  const [selectedPeriod, setSelectedPeriod] = useState("current-month")

  const companyName = "Enel Distribuição São Paulo"

  const reportData = {
    performance: {
      totalCustomers: 1247,
      totalDebts: 3456,
      totalAmount: 2847392.5,
      recoveredAmount: 1234567.89,
      recoveryRate: 43.4,
      monthlyGrowth: 12.5,
    },
    trends: [
      { month: "Jan", recovered: 180000, target: 200000 },
      { month: "Fev", recovered: 220000, target: 210000 },
      { month: "Mar", recovered: 280000, target: 250000 },
    ],
    segments: [
      { segment: "Residencial", customers: 856, amount: 1456789.23, rate: 45.2 },
      { segment: "Comercial", customers: 312, amount: 987654.32, rate: 38.7 },
      { segment: "Industrial", customers: 79, amount: 402948.95, rate: 52.1 },
    ],
  }

  const handleExportReport = (reportType: string) => {
    console.log("[v0] Exportando relatório:", reportType, "para empresa:", params.id)

    const csvContent = `data:text/csv;charset=utf-8,Relatório ${reportType} - ${companyName}\\n\\nPeríodo: ${selectedPeriod}\\nTotal de Clientes: ${reportData.performance.totalCustomers}\\nTaxa de Recuperação: ${reportData.performance.recoveryRate}%\\n\\nExportado em: ${new Date().toLocaleString("pt-BR")}`

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `relatorio-${reportType}-${companyName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    alert(`Relatório ${reportType} exportado com sucesso!`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            {/* Fixed placeholder image URL from /.jpg to /placeholder.svg */}
            <AvatarImage src={`/.jpg?key=08k6f&height=64&width=64&query=${companyName}`} />
            <AvatarFallback className="bg-altea-gold/10 text-altea-navy text-lg">
              {companyName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Relatórios da Empresa</h1>
            <p className="text-gray-600 dark:text-gray-400">{companyName}</p>
          </div>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild variant="outline">
            <Link href={`/super-admin/companies/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Mês Atual</SelectItem>
              <SelectItem value="last-month">Mês Anterior</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>
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
            <div className="text-2xl font-bold">{reportData.performance.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{reportData.performance.monthlyGrowth}%</span> vs mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {(reportData.performance.totalAmount / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">Em cobrança</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recuperação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{reportData.performance.recoveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              R$ {(reportData.performance.recoveredAmount / 1000).toFixed(0)}k recuperado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dívidas Ativas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.performance.totalDebts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total de dívidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="segments">Segmentação</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Relatório de Performance</span>
                </CardTitle>
                <Button size="sm" onClick={() => handleExportReport("performance")}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Taxa de Recuperação</span>
                    <span className="text-sm text-green-600">{reportData.performance.recoveryRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${reportData.performance.recoveryRate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Valor Recuperado</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {(reportData.performance.recoveredAmount / 1000).toFixed(0)}k
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Crescimento</p>
                    <p className="text-2xl font-bold text-blue-600">+{reportData.performance.monthlyGrowth}%</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Insights Principais</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Taxa de recuperação acima da média do setor</li>
                    <li>• Crescimento consistente nos últimos 3 meses</li>
                    <li>• Melhor performance em clientes residenciais</li>
                    <li>• Oportunidade de melhoria em clientes comerciais</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Análise Temporal</span>
                </CardTitle>
                <Button size="sm" onClick={() => handleExportReport("temporal")}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">
                      {reportData.trends
                        .reduce((sum, month) => sum + month.recovered, 0)
                        .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    <p className="text-sm text-gray-600">Total recuperado no período</p>
                  </div>

                  <div className="space-y-3">
                    {reportData.trends.map((month, index) => (
                      <div key={month.month} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{month.month}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(month.recovered / month.target) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {((month.recovered / month.target) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Análise de Tendências</span>
              </CardTitle>
              <Button onClick={() => handleExportReport("tendencias")}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reportData.trends.map((month, index) => (
                  <Card key={month.month}>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="font-bold text-lg">{month.month}</h3>
                        <p className="text-2xl font-bold text-green-600">
                          {month.recovered.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        <p className="text-sm text-gray-600">
                          Meta: {month.target.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${month.recovered >= month.target ? "bg-green-600" : "bg-yellow-600"}`}
                              style={{ width: `${Math.min((month.recovered / month.target) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {((month.recovered / month.target) * 100).toFixed(1)}% da meta
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5" />
                <span>Segmentação de Clientes</span>
              </CardTitle>
              <Button onClick={() => handleExportReport("segmentacao")}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.segments.map((segment, index) => (
                  <div
                    key={segment.segment}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{segment.segment}</h3>
                      <p className="text-sm text-gray-600">{segment.customers.toLocaleString()} clientes</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">
                        {segment.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                      <p className="text-sm text-gray-600">Volume</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-green-600">{segment.rate.toFixed(1)}%</p>
                      <p className="text-sm text-gray-600">Taxa</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
