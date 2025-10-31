import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { Users, ArrowLeft, Mail, Phone, DollarSign, AlertTriangle, TrendingUp, MapPin } from "lucide-react"
import { notFound } from "next/navigation"

export default async function ManageCustomersPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", params.id)
    .single()

  if (companyError || !company) {
    notFound()
  }

  const { data: customers } = await supabase
    .from("customers")
    .select(`
      *,
      debts (
        id,
        amount,
        status,
        due_date,
        paid_at
      )
    `)
    .eq("company_id", params.id)
    .order("created_at", { ascending: false })

  const { data: vmaxCustomers } = await supabase.from("VMAX").select("*").eq("id_company", params.id)

  const vmaxProcessed = (vmaxCustomers || []).map((vmax) => {
    const vencidoStr = String(vmax.Vencido || vmax.vencido || "0")
    const vencidoValue = Number(vencidoStr.replace(/[^\d,]/g, "").replace(",", "."))
    const diasInad = Number(vmax["Dias_Inad."] || vmax.dias_inad || 0)
    const primeiraVencida = vmax.Primeira_Vencida || vmax.primeira_vencida
    const dtCancelamento = vmax.DT_Cancelamento || vmax.dt_cancelamento

    let status: "active" | "overdue" | "negotiating" | "paid" = "active"
    if (dtCancelamento) status = "paid"
    else if (diasInad > 0) status = "overdue"

    return {
      id: vmax.id || `vmax-${Math.random()}`,
      name: vmax.Cliente || vmax.cliente || "Cliente VMAX",
      email: null,
      phone: null,
      document: vmax["CPF/CNPJ"] || vmax.cpf_cnpj || "N/A",
      company_id: params.id,
      created_at: primeiraVencida || new Date().toISOString(),
      totalDebt: vencidoValue,
      overdueDebt: diasInad > 0 ? vencidoValue : 0,
      lastPayment: dtCancelamento || primeiraVencida || new Date().toISOString(),
      status,
      city: vmax.Cidade || vmax.cidade || null,
      daysOverdue: diasInad,
    }
  })

  const customersWithStats = (customers || []).map((customer) => {
    const debts = customer.debts || []
    const totalDebt = debts.reduce((sum: number, debt: any) => sum + (debt.amount || 0), 0)
    const overdueDebts = debts.filter((debt: any) => {
      if (debt.status === "paid") return false
      if (!debt.due_date) return false
      return new Date(debt.due_date) < new Date()
    })
    const overdueDebt = overdueDebts.reduce((sum: number, debt: any) => sum + (debt.amount || 0), 0)
    const lastPayment = debts
      .filter((d: any) => d.paid_at)
      .sort((a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())[0]?.paid_at

    const oldestOverdueDebt = overdueDebts.sort(
      (a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
    )[0]
    const daysOverdue = oldestOverdueDebt
      ? Math.floor((new Date().getTime() - new Date(oldestOverdueDebt.due_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    let status: "active" | "overdue" | "negotiating" | "paid" = "active"
    if (totalDebt === 0) status = "paid"
    else if (overdueDebt > 0) status = "overdue"

    return {
      ...customer,
      totalDebt,
      overdueDebt,
      lastPayment: lastPayment || customer.created_at,
      status,
      daysOverdue,
    }
  })

  const allCustomers = [...customersWithStats, ...vmaxProcessed]

  const totalCustomers = allCustomers.length
  const overdueCustomers = allCustomers.filter((c) => c.status === "overdue").length
  const totalDebtAmount = allCustomers.reduce((sum, c) => sum + c.totalDebt, 0)
  const totalOverdueAmount = allCustomers.reduce((sum, c) => sum + c.overdueDebt, 0)
  const paidCustomers = allCustomers.filter((c) => c.status === "paid").length
  const recoveryRate = totalCustomers > 0 ? Math.round((paidCustomers / totalCustomers) * 100) : 0

  console.log("[v0] Customers data:", {
    totalCustomers,
    overdueCustomers,
    totalDebtAmount,
    vmaxCustomers: vmaxProcessed.length,
  })

  const getStatusLabel = (status: string) => {
    const statuses = {
      active: "Ativo",
      overdue: "Em Atraso",
      negotiating: "Negociando",
      paid: "Quitado",
    }
    return statuses[status as keyof typeof statuses] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "overdue":
        return "destructive"
      case "negotiating":
        return "secondary"
      case "paid":
        return "outline"
      default:
        return "default"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gerenciar Clientes</h1>
          <p className="text-gray-600 dark:text-gray-400">{company.name}</p>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild variant="outline">
            <Link href={`/super-admin/empresas/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">{overdueCustomers} em atraso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalDebtAmount)}
            </div>
            <p className="text-xs text-muted-foreground">Em dívidas ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalOverdueAmount)}
            </div>
            <p className="text-xs text-muted-foreground">{overdueCustomers} clientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recuperação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recoveryRate}%</div>
            <p className="text-xs text-muted-foreground">{paidCustomers} quitados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Clientes ({totalCustomers})</span>
          </CardTitle>
          <CardDescription>Lista de clientes da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allCustomers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum cliente cadastrado</p>
                <p className="text-sm text-gray-400 mt-2">Importe uma base de clientes para começar</p>
              </div>
            ) : (
              allCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>
                        {customer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium">{customer.name}</p>
                        <Badge variant={getStatusColor(customer.status)}>{getStatusLabel(customer.status)}</Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        {customer.email && (
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.email}
                          </span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {customer.phone}
                          </span>
                        )}
                        {customer.city && (
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {customer.city}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>CPF/CNPJ: {customer.document}</span>
                        {customer.daysOverdue > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-red-600 font-medium">{customer.daysOverdue} dias em atraso</span>
                          </>
                        )}
                        {customer.lastPayment && (
                          <>
                            <span>•</span>
                            <span>Última atividade: {new Date(customer.lastPayment).toLocaleDateString("pt-BR")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(customer.totalDebt)}
                    </div>
                    {customer.overdueDebt > 0 && (
                      <div className="text-sm text-red-600 dark:text-red-400">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(customer.overdueDebt)}{" "}
                        em atraso
                      </div>
                    )}
                    {customer.lastPayment && (
                      <div className="text-xs text-gray-500 mt-1">
                        {customer.status === "paid"
                          ? `Quitado em: ${new Date(customer.lastPayment).toLocaleDateString("pt-BR")}`
                          : `Vencimento: ${new Date(customer.lastPayment).toLocaleDateString("pt-BR")}`}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
