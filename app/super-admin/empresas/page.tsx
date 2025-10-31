import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Plus, Upload, Download } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function EmpresasPage() {
  const supabase = createAdminClient()

  const { data: companies } = await supabase.from("companies").select("*").order("name")

  const companiesWithCounts = await Promise.all(
    (companies || []).map(async (company) => {
      // Buscar clientes da tabela customers
      const { count: customersCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)

      // Buscar dívidas da tabela debts
      const { data: debts } = await supabase.from("debts").select("amount").eq("company_id", company.id)

      // Buscar clientes da tabela VMAX
      const { data: vmaxData } = await supabase.from("VMAX").select("*").eq("id_company", company.id)

      // Calcular total de clientes (customers + VMAX)
      const vmaxCount = vmaxData?.length || 0
      const totalCustomers = (customersCount || 0) + vmaxCount

      // Calcular total de dívidas (debts + VMAX)
      const debtsTotal = debts?.reduce((sum, debt) => sum + (debt.amount || 0), 0) || 0

      // Processar valores da tabela VMAX (coluna Vencido)
      const vmaxTotal = (vmaxData || []).reduce((sum, vmax) => {
        const vencidoStr = String(vmax.Vencido || vmax.vencido || "0")
        const vencidoValue = Number(vencidoStr.replace(/[^\d,]/g, "").replace(",", "."))
        return sum + vencidoValue
      }, 0)

      const totalDebts = debtsTotal + vmaxTotal
      const debtsCount = (debts?.length || 0) + vmaxCount

      console.log(`[v0] Empresa ${company.name}:`, {
        customersTable: customersCount || 0,
        vmaxTable: vmaxCount,
        totalCustomers,
        debtsTotal,
        vmaxTotal,
        totalDebts,
      })

      return {
        ...company,
        customersCount: totalCustomers,
        debtsCount: debtsCount,
        totalDebtAmount: totalDebts,
      }
    }),
  )

  console.log("[v0] Empresas carregadas:", companiesWithCounts.length)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Empresas</h1>
          <p className="text-muted-foreground">Gerencie empresas clientes e suas bases de dados</p>
        </div>
        <Link href="/super-admin/empresas/nova">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Empresa
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companiesWithCounts?.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                </div>
              </div>
              <CardDescription>{company.cnpj}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Clientes</p>
                  <p className="text-2xl font-bold">{company.customersCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dívidas</p>
                  <p className="text-2xl font-bold">{company.debtsCount}</p>
                </div>
              </div>

              {company.totalDebtAmount > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-lg font-bold text-primary">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(company.totalDebtAmount)}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Link href={`/super-admin/empresas/${company.id}`} className="flex-1">
                  <Button variant="outline" className="w-full bg-transparent">
                    Ver Detalhes
                  </Button>
                </Link>
                <Link href={`/super-admin/empresas/${company.id}/base`}>
                  <Button variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/super-admin/empresas/${company.id}/exportar`}>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!companiesWithCounts || companiesWithCounts.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma empresa cadastrada</p>
            <p className="text-sm text-muted-foreground mb-4">Comece criando sua primeira empresa cliente</p>
            <Link href="/super-admin/empresas/nova">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Empresa
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
