"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveTabs } from "@/components/ui/responsive-tabs"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Mail,
  MessageSquare,
  Phone,
  FileText,
  Calendar,
  Download,
} from "lucide-react"

// Mock data generators for different periods
const generateKPIsByPeriod = (period: string) => {
  const multipliers = {
    "7d": { debt: 0.2, recovered: 0.15, rate: 0.8, customers: 0.3, overdue: 0.25, time: 1.2, actions: 0.1 },
    "30d": { debt: 1, recovered: 1, rate: 1, customers: 1, overdue: 1, time: 1, actions: 1 },
    "90d": { debt: 2.8, recovered: 2.5, rate: 1.1, customers: 2.2, overdue: 2.1, time: 0.9, actions: 3.2 },
    "1y": { debt: 12.5, recovered: 11.2, rate: 1.3, customers: 8.7, overdue: 7.8, time: 0.7, actions: 15.6 },
  }

  const mult = multipliers[period as keyof typeof multipliers] || multipliers["30d"]

  return {
    totalDebt: Math.round(2847650.0 * mult.debt),
    recoveredAmount: Math.round(1245890.0 * mult.recovered),
    recoveryRate: Math.round(43.7 * mult.rate * 10) / 10,
    activeCustomers: Math.round(1247 * mult.customers),
    overdueCustomers: Math.round(543 * mult.overdue),
    averageRecoveryTime: Math.round(18.5 * mult.time * 10) / 10,
    totalActions: Math.round(8934 * mult.actions),
    successfulActions: Math.round(3892 * mult.actions),
  }
}

const generateRecoveryTrendByPeriod = (period: string) => {
  const baseData = [
    { month: "Jan", recovered: 85000, target: 100000 },
    { month: "Fev", recovered: 92000, target: 100000 },
    { month: "Mar", recovered: 78000, target: 100000 },
    { month: "Abr", recovered: 105000, target: 100000 },
    { month: "Mai", recovered: 118000, target: 100000 },
    { month: "Jun", recovered: 124000, target: 100000 },
  ]

  const periodData = {
    "7d": [
      { month: "Seg", recovered: 12000, target: 15000 },
      { month: "Ter", recovered: 8500, target: 15000 },
      { month: "Qua", recovered: 18000, target: 15000 },
      { month: "Qui", recovered: 22000, target: 15000 },
      { month: "Sex", recovered: 16000, target: 15000 },
      { month: "Sáb", recovered: 9000, target: 15000 },
      { month: "Dom", recovered: 5500, target: 15000 },
    ],
    "30d": baseData,
    "90d": [
      { month: "Abr", recovered: 285000, target: 300000 },
      { month: "Mai", recovered: 320000, target: 300000 },
      { month: "Jun", recovered: 298000, target: 300000 },
    ],
    "1y": [
      { month: "2023", recovered: 1200000, target: 1300000 },
      { month: "2024", recovered: 1450000, target: 1300000 },
    ],
  }

  return periodData[period as keyof typeof periodData] || baseData
}

const generateClassificationByPeriod = (period: string) => {
  const variations = {
    "7d": [
      { name: "Baixo Risco", value: 52, color: "#10b981" },
      { name: "Médio Risco", value: 28, color: "#f59e0b" },
      { name: "Alto Risco", value: 15, color: "#ef4444" },
      { name: "Crítico", value: 5, color: "#7c2d12" },
    ],
    "30d": [
      { name: "Baixo Risco", value: 45, color: "#10b981" },
      { name: "Médio Risco", value: 30, color: "#f59e0b" },
      { name: "Alto Risco", value: 20, color: "#ef4444" },
      { name: "Crítico", value: 5, color: "#7c2d12" },
    ],
    "90d": [
      { name: "Baixo Risco", value: 38, color: "#10b981" },
      { name: "Médio Risco", value: 32, color: "#f59e0b" },
      { name: "Alto Risco", value: 22, color: "#ef4444" },
      { name: "Crítico", value: 8, color: "#7c2d12" },
    ],
    "1y": [
      { name: "Baixo Risco", value: 35, color: "#10b981" },
      { name: "Médio Risco", value: 35, color: "#f59e0b" },
      { name: "Alto Risco", value: 25, color: "#ef4444" },
      { name: "Crítico", value: 5, color: "#7c2d12" },
    ],
  }

  return variations[period as keyof typeof variations] || variations["30d"]
}

const generateChannelPerformanceByPeriod = (period: string) => {
  const multipliers = {
    "7d": 0.15,
    "30d": 1,
    "90d": 3.2,
    "1y": 12.8,
  }

  const mult = multipliers[period as keyof typeof multipliers] || 1

  return [
    {
      channel: "Email",
      sent: Math.round(3245 * mult),
      delivered: Math.round(3102 * mult),
      opened: Math.round(1856 * mult),
      clicked: Math.round(743 * mult),
      converted: Math.round(234 * mult),
    },
    {
      channel: "SMS",
      sent: Math.round(2156 * mult),
      delivered: Math.round(2089 * mult),
      opened: Math.round(1876 * mult),
      clicked: 0,
      converted: Math.round(187 * mult),
    },
    {
      channel: "WhatsApp",
      sent: Math.round(1834 * mult),
      delivered: Math.round(1798 * mult),
      opened: Math.round(1654 * mult),
      clicked: Math.round(892 * mult),
      converted: Math.round(298 * mult),
    },
    {
      channel: "Ligação",
      sent: Math.round(567 * mult),
      delivered: Math.round(534 * mult),
      opened: Math.round(534 * mult),
      clicked: 0,
      converted: Math.round(156 * mult),
    },
  ]
}

const generateAgingReportByPeriod = (period: string) => {
  const multipliers = {
    "7d": 0.2,
    "30d": 1,
    "90d": 2.8,
    "1y": 11.5,
  }

  const mult = multipliers[period as keyof typeof multipliers] || 1

  return [
    { range: "0-30 dias", count: Math.round(234 * mult), amount: Math.round(456780 * mult) },
    { range: "31-60 dias", count: Math.round(189 * mult), amount: Math.round(378920 * mult) },
    { range: "61-90 dias", count: Math.round(156 * mult), amount: Math.round(298450 * mult) },
    { range: "91-120 dias", count: Math.round(98 * mult), amount: Math.round(189340 * mult) },
    { range: ">120 dias", count: Math.round(67 * mult), amount: Math.round(134560 * mult) },
  ]
}

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d")
  const [selectedMetric, setSelectedMetric] = useState("recovery")

  const mockKPIs = useMemo(() => generateKPIsByPeriod(selectedPeriod), [selectedPeriod])
  const mockRecoveryTrend = useMemo(() => generateRecoveryTrendByPeriod(selectedPeriod), [selectedPeriod])
  const mockClassificationData = useMemo(() => generateClassificationByPeriod(selectedPeriod), [selectedPeriod])
  const mockChannelPerformance = useMemo(() => generateChannelPerformanceByPeriod(selectedPeriod), [selectedPeriod])
  const mockAgingReport = useMemo(() => generateAgingReportByPeriod(selectedPeriod), [selectedPeriod])

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Relatórios e Análises</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            Acompanhe o desempenho das suas cobranças e tome decisões baseadas em dados
          </p>
        </div>
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full md:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
              <SelectItem value="1y">1 ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-full md:w-auto bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Total em Cobrança</p>
                <p className="text-lg md:text-2xl font-bold">
                  {mockKPIs.totalDebt.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">+12.5%</span>
                </div>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/20 p-2 md:p-3 rounded-lg">
                <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Valor Recuperado</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
                  {mockKPIs.recoveredAmount.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">+8.3%</span>
                </div>
              </div>
              <div className="bg-green-100 dark:bg-green-900/20 p-2 md:p-3 rounded-lg">
                <CheckCircle className="h-4 w-4 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Taxa de Recuperação</p>
                <p className="text-lg md:text-2xl font-bold text-purple-600">{mockKPIs.recoveryRate}%</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-xs text-red-600">-2.1%</span>
                </div>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/20 p-2 md:p-3 rounded-lg">
                <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Tempo Médio</p>
                <p className="text-lg md:text-2xl font-bold text-orange-600">{mockKPIs.averageRecoveryTime} dias</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">-3.2 dias</span>
                </div>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/20 p-2 md:p-3 rounded-lg">
                <Clock className="h-4 w-4 md:h-6 md:w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ResponsiveTabs defaultValue="overview" className="space-y-4 md:space-y-6">
        <ResponsiveTabs.List>
          <ResponsiveTabs.Trigger value="overview">Visão Geral</ResponsiveTabs.Trigger>
          <ResponsiveTabs.Trigger value="recovery">Recuperação</ResponsiveTabs.Trigger>
          <ResponsiveTabs.Trigger value="channels">Canais</ResponsiveTabs.Trigger>
          <ResponsiveTabs.Trigger value="aging">Aging</ResponsiveTabs.Trigger>
          <ResponsiveTabs.Trigger value="performance">Performance</ResponsiveTabs.Trigger>
        </ResponsiveTabs.List>

        <ResponsiveTabs.Content value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Evolução da Recuperação</CardTitle>
                <CardDescription className="text-sm">Comparativo entre valor recuperado e meta mensal</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={mockRecoveryTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) =>
                        value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="recovered"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="target"
                      stackId="2"
                      stroke="#6b7280"
                      fill="#6b7280"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Classificação de Risco</CardTitle>
                <CardDescription className="text-sm">Distribuição dos clientes por nível de risco</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={mockClassificationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockClassificationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </ResponsiveTabs.Content>

        <ResponsiveTabs.Content value="recovery">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Tendência de Recuperação</CardTitle>
                <CardDescription className="text-sm">Evolução mensal dos valores recuperados</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={mockRecoveryTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) =>
                        value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      }
                    />
                    <Line type="monotone" dataKey="recovered" stroke="#10b981" strokeWidth={3} />
                    <Line type="monotone" dataKey="target" stroke="#6b7280" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Métricas de Recuperação</CardTitle>
                <CardDescription className="text-sm">Indicadores principais do período</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-400">Taxa de Sucesso</p>
                    <p className="text-2xl font-bold text-green-600">{mockKPIs.recoveryRate}%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Clientes Ativos</p>
                    <p className="text-2xl font-bold text-blue-600">{mockKPIs.activeCustomers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-400">Em Atraso</p>
                    <p className="text-2xl font-bold text-orange-600">{mockKPIs.overdueCustomers}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-400">Tempo Médio</p>
                    <p className="text-2xl font-bold text-purple-600">{mockKPIs.averageRecoveryTime}d</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </ResponsiveTabs.Content>

        <ResponsiveTabs.Content value="channels">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Performance por Canal</CardTitle>
              <CardDescription className="text-sm">
                Análise detalhada da efetividade de cada canal de comunicação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 md:space-y-6">
                {mockChannelPerformance.map((channel) => {
                  const deliveryRate = ((channel.delivered / channel.sent) * 100).toFixed(1)
                  const openRate = ((channel.opened / channel.delivered) * 100).toFixed(1)
                  const conversionRate = ((channel.converted / channel.sent) * 100).toFixed(1)

                  const getChannelIcon = (channelName: string) => {
                    switch (channelName) {
                      case "Email":
                        return <Mail className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                      case "SMS":
                        return <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                      case "WhatsApp":
                        return <MessageSquare className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                      case "Ligação":
                        return <Phone className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
                      default:
                        return <FileText className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
                    }
                  }

                  return (
                    <div key={channel.channel} className="border rounded-lg p-3 md:p-4">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="flex items-center space-x-2 md:space-x-3">
                          {getChannelIcon(channel.channel)}
                          <h3 className="text-base md:text-lg font-semibold">{channel.channel}</h3>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {channel.sent} enviados
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-lg md:text-2xl font-bold text-blue-600">{deliveryRate}%</p>
                          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Taxa de Entrega</p>
                          <p className="text-xs text-gray-500">{channel.delivered} entregues</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg md:text-2xl font-bold text-green-600">{openRate}%</p>
                          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Taxa de Abertura</p>
                          <p className="text-xs text-gray-500">{channel.opened} abertos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg md:text-2xl font-bold text-purple-600">{conversionRate}%</p>
                          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Taxa de Conversão</p>
                          <p className="text-xs text-gray-500">{channel.converted} convertidos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg md:text-2xl font-bold text-orange-600">
                            {channel.clicked > 0 ? ((channel.clicked / channel.opened) * 100).toFixed(1) + "%" : "N/A"}
                          </p>
                          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Taxa de Clique</p>
                          <p className="text-xs text-gray-500">{channel.clicked} cliques</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </ResponsiveTabs.Content>

        <ResponsiveTabs.Content value="aging">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Relatório de Aging</CardTitle>
              <CardDescription className="text-sm">Análise de dívidas por faixa de vencimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAgingReport.map((item, index) => {
                  const percentage = ((item.amount / mockKPIs.totalDebt) * 100).toFixed(1)
                  return (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{item.range}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{item.count} clientes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {item.amount.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{percentage}% do total</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockAgingReport}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) =>
                        value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      }
                    />
                    <Bar dataKey="amount" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </ResponsiveTabs.Content>

        <ResponsiveTabs.Content value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Ações de Cobrança</CardTitle>
                <CardDescription className="text-sm">Resumo das ações executadas no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="font-medium">Total de Ações</span>
                    <span className="text-2xl font-bold">{mockKPIs.totalActions}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                    <span className="font-medium text-green-800 dark:text-green-400">Ações Bem-sucedidas</span>
                    <span className="text-2xl font-bold text-green-600">{mockKPIs.successfulActions}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                    <span className="font-medium text-blue-800 dark:text-blue-400">Taxa de Sucesso</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {((mockKPIs.successfulActions / mockKPIs.totalActions) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Distribuição de Ações</CardTitle>
                <CardDescription className="text-sm">Ações por tipo de canal</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Email", value: 3245, color: "#3b82f6" },
                        { name: "SMS", value: 2156, color: "#10b981" },
                        { name: "WhatsApp", value: 1834, color: "#22c55e" },
                        { name: "Ligação", value: 567, color: "#f59e0b" },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: "Email", value: 3245, color: "#3b82f6" },
                        { name: "SMS", value: 2156, color: "#10b981" },
                        { name: "WhatsApp", value: 1834, color: "#22c55e" },
                        { name: "Ligação", value: 567, color: "#f59e0b" },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </ResponsiveTabs.Content>
      </ResponsiveTabs>
    </div>
  )
}
