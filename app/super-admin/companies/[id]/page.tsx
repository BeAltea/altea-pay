import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  Users,
  DollarSign,
  TrendingUp,
  Edit,
  Settings,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  Plug,
  Upload,
  Download,
} from "lucide-react"
import { formatCurrency } from "@/lib/format-currency"

interface CompanyDetailsProps {
  params: {
    id: string
  }
}

export default async function CompanyDetailsPage({ params }: CompanyDetailsProps) {
  const supabase = createAdminClient()

  const { data: companyData, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", params.id)
    .single()

  if (companyError || !companyData) {
    console.error("[v0] Error fetching company:", companyError)
    notFound()
  }

  const { data: customersData } = await supabase.from("customers").select("*").eq("company_id", params.id)

  const { data: debtsData } = await supabase.from("debts").select("*").eq("company_id", params.id)

  const { data: paymentsData } = await supabase.from("payments").select("*").eq("company_id", params.id)

  const { data: adminsData } = await supabase
    .from("profiles")
    .select("*")
    .eq("company_id", params.id)
    .eq("role", "admin")

  const { data: vmaxData } = await supabase.from("VMAX").select("*").eq("id_company", params.id)

  console.log("[v0] 📊 VMAX records for company:", vmaxData?.length || 0)

  const allCustomers = [...(customersData || []), ...(vmaxData || [])]
  const totalCustomers = allCustomers.length

  const totalDebts = debtsData?.length || 0
  const totalAmount = debtsData?.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) || 0

  const vmaxTotalAmount =
    vmaxData?.reduce((sum, v) => {
      const vencidoStr = String(v.Vencido || "0")
      // Remove "R$", spaces, dots (thousands separator), and convert comma to dot
      const cleanValue = vencidoStr
        .replace(/R\$/g, "")
        .replace(/\s/g, "")
        .replace(/\./g, "") // Remove dots used as thousands separator
        .replace(",", ".") // Convert comma to dot for decimal
      const value = Number(cleanValue) || 0
      return sum + value
    }, 0) || 0

  const combinedTotalAmount = totalAmount + vmaxTotalAmount
  const recoveredAmount = paymentsData?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0
  const recoveryRate = combinedTotalAmount > 0 ? (recoveredAmount / combinedTotalAmount) * 100 : 0

  const overdueDebts = debtsData?.filter((d) => d.status === "overdue").length || 0
  const vmaxOverdueDebts =
    vmaxData?.filter((v) => {
      const diasInadStr = String(v["Dias Inad."] || "0")
      // Remove ponto usado como separador de milhar no formato brasileiro
      const diasInad = Number(diasInadStr.replace(/\./g, "")) || 0
      return diasInad > 0
    }).length || 0
  const totalOverdueDebts = overdueDebts + vmaxOverdueDebts

  const admins = adminsData?.length || 0

  const daysOverdueData = vmaxData?.map((v) => {
    const diasStr = String(v["Dias Inad."] || "0")
    // Remove ponto usado como separador de milhar no formato brasileiro
    return Number(diasStr.replace(/\./g, "")) || 0
  }) || []
  const avgDaysOverdue =
    daysOverdueData.length > 0 ? daysOverdueData.reduce((sum, days) => sum + days, 0) / daysOverdueData.length : 0

  const debts0to30 = daysOverdueData.filter((d) => d >= 0 && d <= 30).length
  const debts31to60 = daysOverdueData.filter((d) => d > 30 && d <= 60).length
  const debts61to90 = daysOverdueData.filter((d) => d > 60 && d <= 90).length
  const debtsOver90 = daysOverdueData.filter((d) => d > 90).length

  const { data: recentPayments } = await supabase
    .from("payments")
    .select("*")
    .eq("company_id", params.id)
    .order("created_at", { ascending: false })
    .limit(2)

  const { data: recentDebts } = await supabase
    .from("debts")
    .select("*")
    .eq("company_id", params.id)
    .order("created_at", { ascending: false })
    .limit(2)

  const recentActivity = [
    ...(recentPayments || []).map((payment) => ({
      id: payment.id,
      type: "payment",
      description: `Pagamento de ${new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(payment.amount)} recebido`,
      amount: payment.amount,
      time: new Date(payment.created_at).toLocaleDateString("pt-BR"),
      status: "success",
    })),
    ...(recentDebts || []).map((debt) => ({
      id: debt.id,
      type: "debt_added",
      description: `Nova dívida adicionada`,
      time: new Date(debt.created_at).toLocaleDateString("pt-BR"),
      status: "info",
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 4)

  if (recentActivity.length === 0) {
    recentActivity.push({
      id: "empty",
      type: "info",
      description: "Nenhuma atividade recente registrada",
      time: "N/A",
      status: "info",
    })
  }

  const company = {
    id: companyData.id,
    name: companyData.name,
    cnpj: companyData.cnpj || "N/A",
    email: companyData.email || "N/A",
    phone: companyData.phone || "N/A",
    status: companyData.status || "active",
    created_at: companyData.created_at,
    description: companyData.description || "",
    address: typeof companyData.address === "string" ? companyData.address : companyData.address || "N/A",
    segment: companyData.segment || "N/A",
    totalCustomers,
    totalDebts: totalDebts + (vmaxData?.length || 0),
    totalAmount: combinedTotalAmount,
    recoveredAmount,
    recoveryRate,
    overdueDebts: totalOverdueDebts,
    admins,
    lastActivity: companyData.updated_at || companyData.created_at,
  }

  console.log("[v0] Company details:", {
    id: company.id,
    name: company.name,
    totalCustomers,
    totalDebts: company.totalDebts,
    totalAmount: combinedTotalAmount,
    vmaxRecords: vmaxData?.length || 0,
    vmaxTotalAmount,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-4">
            <Link href="/super-admin/companies">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={companyData.logo_url || ""} alt={companyData.name} />
              <AvatarFallback className="text-lg font-bold">
                {companyData.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{companyData.name}</h1>
                <Badge variant={company.status === "active" ? "default" : "secondary"}>
                  {company.status === "active" ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">CNPJ: {company.cnpj}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none min-w-0 bg-transparent">
            <Link href={`/super-admin/companies/${company.id}/import`}>
              <Upload className="h-4 w-4 mr-1 shrink-0" />
              <span className="truncate">Importar</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none min-w-0 bg-transparent">
            <Link href={`/super-admin/companies/${company.id}/export`}>
              <Download className="h-4 w-4 mr-1 shrink-0" />
              <span className="truncate">Exportar</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none min-w-0 bg-transparent">
            <Link href={`/super-admin/companies/${company.id}/customers`}>
              <Users className="h-4 w-4 mr-1 shrink-0" />
              <span className="truncate">Clientes</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none min-w-0 bg-transparent">
            <Link href={`/super-admin/companies/${company.id}/edit`}>
              <Edit className="h-4 w-4 mr-1 shrink-0" />
              <span className="truncate">Editar</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none min-w-0 bg-transparent">
            <Link href={`/super-admin/companies/${company.id}/settings`}>
              <Settings className="h-4 w-4 mr-1 shrink-0" />
              <span className="truncate">Config</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{company.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{company.admins} administradores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Dívidas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{company.totalDebts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{company.overdueDebts} em atraso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(combinedTotalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              R$ {recoveredAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} recuperados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recuperação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recoveryRate.toFixed(1)}%</div>
            <Progress value={recoveryRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dias em Atraso</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                avgDaysOverdue === 0
                  ? "text-green-600 dark:text-green-400"
                  : avgDaysOverdue <= 30
                    ? "text-yellow-600 dark:text-yellow-400"
                    : avgDaysOverdue <= 60
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-red-600 dark:text-red-400"
              }`}
            >
              {Math.round(avgDaysOverdue)}
            </div>
            <p className="text-xs text-muted-foreground">Média de atraso</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Company Information */}
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>Dados cadastrais e de contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{company.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">Telefone</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{company.phone}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium">Endereço</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {typeof company.address === "string"
                      ? company.address
                      : `${company.address.street}, ${company.address.neighborhood}, ${company.address.city} - ${company.address.state}, ${company.address.cep}`}
                  </p>
                </div>
              </div>

              {company.description && (
                <div>
                  <p className="text-sm font-medium mb-2">Descrição</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{company.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>Últimas ações e eventos da empresa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 sm:space-x-4">
                    <div className="flex-shrink-0">
                      {activity.status === "success" && (
                        <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-full">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                      )}
                      {activity.status === "info" && (
                        <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full">
                          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                      {activity.status === "warning" && (
                        <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-full">
                          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
                    </div>
                    {activity.amount && (
                      <div className="text-sm font-medium text-green-600 dark:text-green-400 hidden sm:block">
                        +
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(activity.amount)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Atrasos</CardTitle>
              <CardDescription>Classificação por dias de inadimplência</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm">0-30 dias</span>
                  </div>
                  <span className="text-sm font-medium">{debts0to30} clientes</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">31-60 dias</span>
                  </div>
                  <span className="text-sm font-medium">{debts31to60} clientes</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-sm">61-90 dias</span>
                  </div>
                  <span className="text-sm font-medium">{debts61to90} clientes</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm">Mais de 90 dias</span>
                  </div>
                  <span className="text-sm font-medium">{debtsOver90} clientes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-green-900 dark:text-green-100 text-sm">Sistema Operacional</p>
                    <p className="text-xs text-green-700 dark:text-green-300">Última atividade: há 2 horas</p>
                  </div>
                </div>
              </div>

              {company.overdueDebts > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-orange-900 dark:text-orange-100 text-sm">
                        {company.overdueDebts} Casos em Atraso
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-300">Requerem atenção</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href={`/super-admin/companies/${company.id}/import`}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Clientes
                </Link>
              </Button>
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href={`/super-admin/companies/${company.id}/export`}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Clientes
                </Link>
              </Button>
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href={`/super-admin/companies/${company.id}/users`}>
                  <Users className="mr-2 h-4 w-4" />
                  Gerenciar Usuários
                </Link>
              </Button>
              <Button asChild className="w-full" variant="default">
                <Link href={`/super-admin/companies/${company.id}/customers/new`}>
                  <Users className="mr-2 h-4 w-4" />
                  Cadastrar Cliente
                </Link>
              </Button>
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href={`/super-admin/companies/${company.id}/erp-integration`}>
                  <Plug className="mr-2 h-4 w-4" />
                  Integração ERP
                </Link>
              </Button>
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href={`/super-admin/companies/${company.id}/reports`}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Ver Relatórios
                </Link>
              </Button>
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href={`/super-admin/companies/${company.id}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
