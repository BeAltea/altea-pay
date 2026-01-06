"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { Users, DollarSign, AlertTriangle, MapPin, Handshake, Trash2 } from "lucide-react"
import { deleteCustomer } from "@/app/actions/delete-customer"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type Customer = {
  id: string
  name: string
  document: string
  city: string | null
  status: "active" | "overdue" | "negotiating" | "paid"
  totalDebt: number
  overdueDebt: number
  daysOverdue: number
}

export function CustomersFilterClient({ customers, companyId }: { customers: Customer[]; companyId: string }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [daysSort, setDaysSort] = useState<"none" | "asc" | "desc">("none")
  const [amountSort, setAmountSort] = useState<"none" | "asc" | "desc">("none")
  const router = useRouter()

  const totalCustomers = customers.length
  const overdueCustomers = customers.filter((c) => c.status === "overdue").length
  const totalDebtAmount = customers.reduce((sum, c) => sum + c.totalDebt, 0)
  const totalOverdueAmount = customers.reduce((sum, c) => sum + c.overdueDebt, 0)
  const paidCustomers = customers.filter((c) => c.status === "paid").length

  const filteredAndSortedCustomers = useMemo(() => {
    let result = customers.filter((customer) => {
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return customer.name.toLowerCase().includes(searchLower) || customer.document.toLowerCase().includes(searchLower)
    })

    if (daysSort !== "none") {
      result = [...result].sort((a, b) => {
        return daysSort === "asc" ? a.daysOverdue - b.daysOverdue : b.daysOverdue - a.daysOverdue
      })
    }

    if (amountSort !== "none") {
      result = [...result].sort((a, b) => {
        return amountSort === "asc" ? a.totalDebt - b.totalDebt : b.totalDebt - a.totalDebt
      })
    }

    return result
  }, [customers, searchTerm, daysSort, amountSort])

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

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    const confirmed = confirm(
      `Tem certeza que deseja excluir permanentemente o cliente ${customerName}?\n\nEsta ação não pode ser desfeita e removerá todos os dados associados (acordos, dívidas, pagamentos, etc.).`,
    )

    if (!confirmed) return

    const result = await deleteCustomer(customerId, companyId)

    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium">Quitados</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidCustomers}</div>
            <p className="text-xs text-muted-foreground">Clientes sem débito</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Lista de Clientes ({filteredAndSortedCustomers.length})</span>
          </CardTitle>
          <CardDescription>Filtre e gerencie todos os clientes da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Buscar Cliente</label>
                <Input
                  placeholder="Nome, CPF/CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Ordenar por Dias em Atraso</label>
                <Select value={daysSort} onValueChange={(value: any) => setDaysSort(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem ordenação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem ordenação</SelectItem>
                    <SelectItem value="asc">Menor para Maior</SelectItem>
                    <SelectItem value="desc">Maior para Menor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Ordenar por Valor da Dívida</label>
                <Select value={amountSort} onValueChange={(value: any) => setAmountSort(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem ordenação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem ordenação</SelectItem>
                    <SelectItem value="asc">Menor para Maior</SelectItem>
                    <SelectItem value="desc">Maior para Menor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredAndSortedCustomers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">
                  {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchTerm ? "Tente buscar por outro termo" : "Importe uma base de clientes para começar"}
                </p>
              </div>
            ) : (
              filteredAndSortedCustomers.map((customer) => (
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
                    <div className="flex gap-2 mt-2">
                      <Button asChild size="sm" className="flex-1 bg-yellow-500 hover:bg-yellow-600">
                        <Link href={`/super-admin/companies/${companyId}/customers/${customer.id}/negotiate`}>
                          <Handshake className="h-4 w-4 mr-2" />
                          Negociar
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 hover:text-red-700 bg-transparent"
                        onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
