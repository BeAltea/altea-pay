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

  // Para cada empresa, busca a contagem de clientes e dívidas
  const companiesWithCounts = await Promise.all(
    (companies || []).map(async (company) => {
      const { count: customersCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)

      const { count: debtsCount } = await supabase
        .from("debts")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)

      return {
        ...company,
        customersCount: customersCount || 0,
        debtsCount: debtsCount || 0,
      }
    }),
  )

  console.log("[v0] Empresas carregadas:", companiesWithCounts.length)
  companiesWithCounts.forEach((c) => {
    console.log(`[v0] Empresa: ${c.name} - Clientes: ${c.customersCount} - Dívidas: ${c.debtsCount}`)
  })

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
