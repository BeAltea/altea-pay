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
  Sparkles,
} from "lucide-react"

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

  const allCustomers = [...(customersData || []), ...(vmaxData || [])]
  const totalCustomers = allCustomers.length

  const totalDebts = debtsData?.length || 0
  const totalAmount = debtsData?.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) || 0

  const vmaxTotalAmount =
    vmaxData?.reduce((sum, v) => {
      const vencido = String(v.Vencido || v.vencido || "0")
        .replace(/[^\d,]/g, "")
        .replace(",", ".")
      const value = Number(vencido) || 0
      console.log("[v0] VMAX record:", v.Cliente, "Vencido:", v.Vencido, "Parsed:", value)
      return sum + value
    }, 0) || 0

  console.log("[v0] VMAX total amount:", vmaxTotalAmount, "Regular debts:", totalAmount)

  const combinedTotalAmount = totalAmount + vmaxTotalAmount
  const recoveredAmount = paymentsData?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0
  const recoveryRate = combinedTotalAmount > 0 ? (recoveredAmount / combinedTotalAmount) * 100 : 0

  const overdueDebts = debtsData?.filter((d) => d.status === "overdue").length || 0
  const vmaxOverdueDebts =
    vmaxData?.filter((v) => {
      const diasInad = Number(v["Dias_Inad."] || v.dias_inad || 0)
      return diasInad > 0
    }).length || 0
  const totalOverdueDebts = overdueDebts + vmaxOverdueDebts

  const admins = adminsData?.length || 0

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/super-admin/companies">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Link>
            </Button>
          </div>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={`/generic-placeholder-icon.png`} alt={company.name} />
              <AvatarFallback className="bg-altea-gold/10 text-altea-navy text-lg">
                {company.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{company.name}</h1>
                <Badge variant={company.status === "active" ? "default" : "destructive"} className="text-xs">
                  {company.status === "active" ? "Ativa" : "Suspensa"}
                </Badge>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                {company.segment} • CNPJ: {company.cnpj}
              </p>
            </div>
          </div>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild variant="outline">
            <Link href={`/super-admin/companies/${company.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/super-admin/companies/${company.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
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
            <div className="text-2xl font-bold">R$ {(company.totalAmount / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">
              R$ {company.recoveredAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} recuperados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recuperação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{company.recoveryRate.toFixed(1)}%</div>
            <Progress value={company.recoveryRate} className="mt-2" />
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
                <Link href={`/super-admin/companies/${company.id}/vmax-analysis`}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Análise VMAX (Gratuita)
                </Link>
              </Button>
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href={`/super-admin/companies/${company.id}/users`}>
                  <Users className="mr-2 h-4 w-4" />
                  Gerenciar Usuários
                </Link>
              </Button>
              <Button asChild className="w-full bg-transparent" variant="outline">
                <Link href={`/super-admin/companies/${company.id}/customers`}>
                  <Users className="mr-2 h-4 w-4" />
                  Gerenciar Clientes
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
