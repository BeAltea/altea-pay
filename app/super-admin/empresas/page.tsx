import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Plus, Upload, Download } from "lucide-react"
import Link from "next/link"

export default async function EmpresasPage() {
  const supabase = await createClient()

  // Busca todas as empresas
  const { data: companies } = await supabase
    .from("companies")
    .select(`
      *,
      customers:customers(count),
      debts:debts(count)
    `)
    .order("name")

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
        {companies?.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                </div>
              </div>
              <CardDescription>{company.document}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Clientes</p>
                  <p className="text-2xl font-bold">{company.customers?.[0]?.count || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Dívidas</p>
                  <p className="text-2xl font-bold">{company.debts?.[0]?.count || 0}</p>
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

      {(!companies || companies.length === 0) && (
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
