import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { Users, ArrowLeft, DollarSign, AlertTriangle, MapPin } from "lucide-react"
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
        due_date
      )
    `)
    .eq("company_id", params.id)
    .order("created_at", { ascending: false })

  const { data: vmaxCustomers } = await supabase.from("VMAX").select("*").eq("id_company", params.id)

  const vmaxProcessed = (vmaxCustomers || []).map((vmax) => {
    const vencidoStr = String(vmax.Vencido || vmax.vencido || "0")
    const vencidoValue = Number(vencidoStr.replace(/[^\d,]/g, "").replace(",", "."))
    const diasInad = Number(vmax["Dias_Inad"] || vmax.dias_inad || 0)
    const primeiraVencida = vmax.Primeira_Vencida || vmax.primeira_vencida
    const dtCancelamento = vmax.DT_Cancelamento || vmax.dt_cancelamento

    let status: "active" | "overdue" | "negotiating" | "paid" = "active"
    if (diasInad > 0) {
      status = "overdue"
    } else if (dtCancelamento) {
      status = "paid"
    }

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
      .filter((d: any) => d.status === "paid")
      .sort((a: any, b: any) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())[0]?.due_date

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Clientes da Empresa</h1>
          <p className="text-gray-600 dark:text-gray-400">{company.name}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/super-admin/companies/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Lista de Clientes ({totalCustomers})</span>
          </CardTitle>
          <CardDescription>Todos os clientes cadastrados na empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Nenhum cliente cadastrado</p>
                <p className="text-sm text-gray-400 mt-2">Importe uma base de clientes para começar</p>
              </div>
            ) : (
              allCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-start sm:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <Avatar className="flex-shrink-0">
                      <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {customer.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-white">{customer.name}</p>
                        <Badge variant={getStatusColor(customer.status)}>{getStatusLabel(customer.status)}</Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-mono text-xs">CPF/CNPJ: {customer.document}</span>
                        {customer.city && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {customer.city}
                            </span>
                          </>
                        )}
                      </div>

                      {customer.daysOverdue > 0 && (
                        <div className="mt-1">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
                              customer.daysOverdue <= 30
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : customer.daysOverdue <= 60
                                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                  : customer.daysOverdue <= 90
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                    : "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100"
                            }`}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {customer.daysOverdue} dias em atraso
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(customer.totalDebt)}
                    </div>
                    {customer.overdueDebt > 0 && (
                      <div className="text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(customer.overdueDebt)}{" "}
                        atraso
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
