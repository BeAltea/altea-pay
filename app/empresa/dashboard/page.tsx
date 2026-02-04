"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, AlertCircle, Users, Clock, CheckCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { runCreditAnalysis } from "@/app/actions/credit-actions"

interface DashboardStats {
  totalCustomers: number
  analyzedCustomers: number
  pendingAnalyses: number
  highRiskCustomers: number
  averageScore: number
}

export default function EmpresaDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    analyzedCustomers: 0,
    pendingAnalyses: 0,
    highRiskCustomers: 0,
    averageScore: 0,
  })
  const [loading, setLoading] = useState(true)
  const [runningAnalysis, setRunningAnalysis] = useState(false)
  const { profile } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (profile?.company_id) {
      loadDashboardData()
    }
  }, [profile])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/company-dashboard?companyId=${profile?.company_id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data")
      }

      const data = await response.json()

      setStats({
        totalCustomers: data.totalCustomers || 0,
        analyzedCustomers: data.analyzedCustomers || 0,
        pendingAnalyses: data.pendingAnalyses || 0,
        highRiskCustomers: data.highRiskCustomers || 0,
        averageScore: data.averageScore || 0,
      })
    } catch (error: any) {
      console.error("[v0] Error loading dashboard data:", error)
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRunAnalysis = async () => {
    try {
      setRunningAnalysis(true)

      const result = await runCreditAnalysis({
        company_id: profile?.company_id!,
        analysis_type: "free",
      })

      if (result.success) {
        toast({
          title: "Análise iniciada",
          description: `${result.processed} clientes serão analisados`,
        })
        loadDashboardData()
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error("[v0] Error running analysis:", error)
      toast({
        title: "Erro ao iniciar análise",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setRunningAnalysis(false)
    }
  }

  const analysisProgress = stats.totalCustomers > 0 ? (stats.analyzedCustomers / stats.totalCustomers) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard da Empresa</h1>
          <p className="text-muted-foreground">Visão geral das análises de crédito</p>
        </div>
        <Button onClick={handleRunAnalysis} disabled={runningAnalysis}>
          {runningAnalysis ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-4 w-4" />
              Executar Análise
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Base completa de clientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Analisados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.analyzedCustomers}</div>
            <Progress value={analysisProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">{analysisProgress.toFixed(1)}% da base</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}</div>
            <p className="text-xs text-muted-foreground">Pontuação média de crédito</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alto Risco</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.highRiskCustomers}</div>
            <p className="text-xs text-muted-foreground">Clientes de alto risco</p>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status das Análises</CardTitle>
          <CardDescription>Acompanhe o progresso das análises de crédito</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Análises Pendentes</p>
                <p className="text-xs text-muted-foreground">{stats.pendingAnalyses} clientes aguardando análise</p>
              </div>
              <Badge variant="secondary">{stats.pendingAnalyses}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Análises Concluídas</p>
                <p className="text-xs text-muted-foreground">{stats.analyzedCustomers} clientes já analisados</p>
              </div>
              <Badge variant="default">{stats.analyzedCustomers}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
