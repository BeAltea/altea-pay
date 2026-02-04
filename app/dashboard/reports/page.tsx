"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, DollarSign, Users, Clock, CheckCircle, AlertTriangle, FileText, Download } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export const dynamic = "force-dynamic"

interface KPIData {
  totalDebt: number
  recoveredAmount: number
  recoveryRate: number
  activeCustomers: number
  overdueCustomers: number
  averageScore: number
  approvedCustomers: number
  rejectedCustomers: number
}

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d")
  const [loading, setLoading] = useState(true)
  const [kpiData, setKpiData] = useState<KPIData>({
    totalDebt: 0,
    recoveredAmount: 0,
    recoveryRate: 0,
    activeCustomers: 0,
    overdueCustomers: 0,
    averageScore: 0,
    approvedCustomers: 0,
    rejectedCustomers: 0,
  })

  useEffect(() => {
    async function fetchRealData() {
      setLoading(true)

      try {
        const response = await fetch("/api/vmax-data")
        if (!response.ok) throw new Error("Failed to fetch VMAX data")
        const vmaxData = await response.json()

        if (vmaxData && vmaxData.length > 0) {
          // Calcular KPIs reais
          const totalClientes = new Set(vmaxData.map((c: any) => c.cpfCnpj)).size
          const aprovados = vmaxData.filter((c: any) => c.approvalStatus === "ACEITA").length
          const rejeitados = vmaxData.filter((c: any) => c.approvalStatus === "REJEITA").length
          const inadimplentes = vmaxData.filter((c: any) => {
            const dias = c.maiorAtraso
            return dias && Number.parseInt(String(dias).replace(/\D/g, "")) > 0
          }).length

          // Calcular total vencido
          const totalVencido = vmaxData.reduce((sum: number, cliente: any) => {
            const vencido = cliente.valorTotal
            if (vencido) {
              const valor = Number.parseFloat(
                vencido
                  .toString()
                  .replace(/[R$.\s]/g, "")
                  .replace(",", "."),
              )
              return sum + (isNaN(valor) ? 0 : valor)
            }
            return sum
          }, 0)

          // Calcular score médio
          const scoresValidos = vmaxData.map((c: any) => c.creditScore).filter((s: any) => s && s > 0)
          const scoreMedio =
            scoresValidos.length > 0 ? scoresValidos.reduce((sum: number, s: number) => sum + s, 0) / scoresValidos.length : 0

          setKpiData({
            totalDebt: totalVencido,
            recoveredAmount: 0,
            recoveryRate: 0,
            activeCustomers: totalClientes,
            overdueCustomers: inadimplentes,
            averageScore: scoreMedio,
            approvedCustomers: aprovados,
            rejectedCustomers: rejeitados,
          })
        }
      } catch (error) {
        console.error("[v0] Erro ao buscar dados:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRealData()
  }, [selectedPeriod])

  const handleExportReport = () => {
    const csvContent = `data:text/csv;charset=utf-8,Relatório de Cobrança - ${selectedPeriod}\n\nKPIs:\nTotal Clientes,${kpiData.activeCustomers}\nClientes Aprovados,${kpiData.approvedCustomers}\nClientes Rejeitados,${kpiData.rejectedCustomers}\nClientes Inadimplentes,${kpiData.overdueCustomers}\nTotal em Cobrança,${kpiData.totalDebt}\nScore Médio,${kpiData.averageScore.toFixed(0)}\n\nExportado em: ${new Date().toLocaleString("pt-BR")}`

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `relatorio-cobranca-${selectedPeriod}-${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    alert(`Relatório exportado com sucesso!`)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando dados reais...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Relatórios e Análises</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            Acompanhe o desempenho das suas cobranças e análises restritivas
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
          <Button variant="outline" className="w-full md:w-auto bg-transparent" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards - Dados REAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Total em Cobrança</p>
                <p className="text-lg md:text-2xl font-bold">
                  {kpiData.totalDebt.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
                <p className="text-xs text-gray-500 mt-1">{kpiData.overdueCustomers} clientes inadimplentes</p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/20 p-2 md:p-3 rounded-lg">
                <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Total de Clientes</p>
                <p className="text-lg md:text-2xl font-bold">{kpiData.activeCustomers}</p>
                <p className="text-xs text-gray-500 mt-1">Clientes cadastrados</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/20 p-2 md:p-3 rounded-lg">
                <Users className="h-4 w-4 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Clientes Aprovados</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">{kpiData.approvedCustomers}</p>
                <p className="text-xs text-gray-500 mt-1">Status: ACEITA</p>
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
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Score Médio</p>
                <p className="text-lg md:text-2xl font-bold">{kpiData.averageScore.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">Análise restritiva</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/20 p-2 md:p-3 rounded-lg">
                <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento de Aprovações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                <p className="text-2xl font-bold text-green-600">{kpiData.approvedCustomers}</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Rejeitados</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status: REJEITA</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-600">{kpiData.rejectedCustomers}</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Inadimplentes</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Com débitos vencidos</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-orange-600">{kpiData.overdueCustomers}</p>
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
                    {kpiData.totalDebt.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-red-600 h-2 rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Score Médio dos Clientes</span>
                  <span className="text-lg font-bold text-purple-600">{kpiData.averageScore.toFixed(0)} pontos</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${(kpiData.averageScore / 1000) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Taxa de Aprovação</p>
                <p className="text-2xl font-bold text-blue-600">
                  {kpiData.activeCustomers > 0
                    ? ((kpiData.approvedCustomers / kpiData.activeCustomers) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informação sobre dados reais */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">Dados Reais do Sistema</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Todos os dados exibidos nesta página são provenientes do banco de dados real do sistema, refletindo as
                análises restritivas realizadas via Assertiva e o status atual de cada cliente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
