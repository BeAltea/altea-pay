"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Database,
  Activity,
  HardDrive,
  Cpu,
  MemoryStick as Memory,
  Network,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Clock,
  Shield,
  Sparkles,
} from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/client"

export default function SystemPage() {
  const { toast } = useToast()
  const [isSeeding, setIsSeeding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dbStats, setDbStats] = useState<any>(null)

  useEffect(() => {
    const fetchDatabaseStats = async () => {
      try {
        const supabase = createBrowserClient()

        console.log("[v0] 🔧 Carregando estatísticas reais do banco de dados...")

        // Count records in each table
        const [
          { count: companiesCount },
          { count: profilesCount },
          { count: debtsCount },
          { count: customersCount },
          { count: vmaxCount },
          { count: creditProfilesCount },
          { count: messagesCount },
          { count: actionsCount },
        ] = await Promise.all([
          supabase.from("companies").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("debts").select("*", { count: "exact", head: true }),
          supabase.from("customers").select("*", { count: "exact", head: true }),
          supabase.from("VMAX").select("*", { count: "exact", head: true }),
          supabase.from("credit_profiles").select("*", { count: "exact", head: true }),
          supabase.from("messages").select("*", { count: "exact", head: true }),
          supabase.from("collection_actions").select("*", { count: "exact", head: true }),
        ])

        const stats = {
          companies: companiesCount || 0,
          profiles: profilesCount || 0,
          debts: debtsCount || 0,
          customers: (customersCount || 0) + (vmaxCount || 0),
          creditProfiles: creditProfilesCount || 0,
          messages: messagesCount || 0,
          actions: actionsCount || 0,
          totalRecords:
            (companiesCount || 0) +
            (profilesCount || 0) +
            (debtsCount || 0) +
            (customersCount || 0) +
            (vmaxCount || 0) +
            (creditProfilesCount || 0) +
            (messagesCount || 0) +
            (actionsCount || 0),
        }

        console.log("[v0] ✅ Estatísticas reais do banco:", stats)
        setDbStats(stats)
      } catch (error) {
        console.error("[v0] ❌ Erro ao carregar estatísticas do banco:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDatabaseStats()
  }, [])

  const handleSeedDemo = async () => {
    setIsSeeding(true)
    try {
      const response = await fetch("/api/seed-demo", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Erro ao executar seed")
      }

      const data = await response.json()

      toast({
        title: "Seed executado com sucesso!",
        description: `Criadas ${data.companies} empresas, ${data.customers} clientes e ${data.debts} dívidas.`,
      })

      window.location.reload()
    } catch (error) {
      toast({
        title: "Erro ao executar seed",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setIsSeeding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando estatísticas do sistema...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistema</h1>
          <p className="text-muted-foreground">Monitoramento e gerenciamento do sistema</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button size="sm">
            <Download className="mr-2 h-4 w-4" />
            Backup
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="database">Banco de Dados</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Status Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Online</div>
                <p className="text-xs text-muted-foreground">Uptime: 99.9%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23%</div>
                <Progress value={23} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memória</CardTitle>
                <Memory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">67%</div>
                <Progress value={67} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Armazenamento</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45%</div>
                <Progress value={45} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* System Health */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Saúde do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Gateway</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Saudável
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Banco de Dados</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Saudável
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cache Redis</span>
                  <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Atenção
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Service</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Saudável
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Tráfego de Rede
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <Download className="h-4 w-4 text-blue-500" />
                    Download
                  </span>
                  <span className="text-sm font-medium">1.2 GB/h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <Upload className="h-4 w-4 text-green-500" />
                    Upload
                  </span>
                  <span className="text-sm font-medium">850 MB/h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Latência Média</span>
                  <span className="text-sm font-medium">45ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Requests/min</span>
                  <span className="text-sm font-medium">1,247</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas Recentes</CardTitle>
              <CardDescription>Últimos eventos e notificações do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Cache Redis com alta utilização</AlertTitle>
                  <AlertDescription>
                    O cache Redis está utilizando 85% da memória disponível. Considere otimizar ou expandir.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Backup automático concluído</AlertTitle>
                  <AlertDescription>Backup diário do banco de dados realizado com sucesso às 03:00.</AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tempo de Resposta API</span>
                    <span>120ms</span>
                  </div>
                  <Progress value={30} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Throughput</span>
                    <span>1,500 req/min</span>
                  </div>
                  <Progress value={75} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Taxa de Erro</span>
                    <span>0.1%</span>
                  </div>
                  <Progress value={1} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recursos do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU Usage</span>
                    <span>23%</span>
                  </div>
                  <Progress value={23} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span>67%</span>
                  </div>
                  <Progress value={67} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Disk I/O</span>
                    <span>12%</span>
                  </div>
                  <Progress value={12} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Status do Banco
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Conexões Ativas</span>
                  <span className="text-sm font-medium">45/100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tamanho do Banco</span>
                  <span className="text-sm font-medium">2.3 GB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Último Backup</span>
                  <span className="text-sm font-medium">Hoje, 03:00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Queries/seg</span>
                  <span className="text-sm font-medium">127</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tabelas Principais</CardTitle>
                <CardDescription>Registros reais no banco de dados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">companies</span>
                    <Badge variant="outline">{dbStats?.companies || 0} registros</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">profiles</span>
                    <Badge variant="outline">{dbStats?.profiles || 0} registros</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">customers (total)</span>
                    <Badge variant="outline">{dbStats?.customers || 0} registros</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">debts</span>
                    <Badge variant="outline">{dbStats?.debts || 0} registros</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">credit_profiles</span>
                    <Badge variant="outline">{dbStats?.creditProfiles || 0} registros</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">messages</span>
                    <Badge variant="outline">{dbStats?.messages || 0} registros</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">collection_actions</span>
                    <Badge variant="outline">{dbStats?.actions || 0} registros</Badge>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3 mt-3">
                    <span className="text-sm font-semibold">Total de Registros</span>
                    <Badge className="bg-primary">{dbStats?.totalRecords || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Status de Segurança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">SSL Certificate</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Válido
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Firewall</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Ativo
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Rate Limiting</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Ativo
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">2FA Enforcement</span>
                  <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                    Parcial
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tentativas de Login</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sucessos (24h)</span>
                  <span className="text-sm font-medium text-green-600">1,247</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Falhas (24h)</span>
                  <span className="text-sm font-medium text-red-600">23</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">IPs Bloqueados</span>
                  <span className="text-sm font-medium">5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Taxa de Sucesso</span>
                  <span className="text-sm font-medium">98.2%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tarefas Agendadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Backup Diário</p>
                    <p className="text-xs text-muted-foreground">Todo dia às 03:00</p>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Ativo
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Limpeza de Logs</p>
                    <p className="text-xs text-muted-foreground">Semanal, domingo</p>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Ativo
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Otimização DB</p>
                    <p className="text-xs text-muted-foreground">Mensal, 1º dia</p>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Ativo
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações de Manutenção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={handleSeedDemo}
                  disabled={isSeeding}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isSeeding ? "Populando banco..." : "Popular Banco (Demo)"}
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reiniciar Serviços
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Database className="mr-2 h-4 w-4" />
                  Otimizar Banco
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <HardDrive className="mr-2 h-4 w-4" />
                  Limpar Cache
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Download className="mr-2 h-4 w-4" />
                  Backup Manual
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
