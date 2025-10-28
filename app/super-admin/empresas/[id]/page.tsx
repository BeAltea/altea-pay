import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, FileText, TrendingUp, ArrowLeft, Upload, Download } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

export default async function EmpresaDetalhesPage({ params }: { params: { id: string } }) {
  if (params.id === "nova") {
    redirect("/super-admin/empresas/nova")
  }

  const supabase = await createClient()

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", params.id)
    .single()

  if (companyError || !company) {
    notFound()
  }

  const { data: customers } = await supabase.from("customers").select("*").eq("company_id", params.id)

  const { data: debts } = await supabase.from("debts").select("*").eq("company_id", params.id)

  const totalDebts = debts?.reduce((sum, debt) => sum + (debt.amount || 0), 0) || 0
  const paidDebts = debts?.filter((d) => d.status === "paid").length || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/empresas">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{company.name}</h1>
          <p className="text-muted-foreground">{company.cnpj}</p>
        </div>
        <Badge variant="default">Ativa</Badge>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Dívidas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{debts?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalDebts)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recuperação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {debts?.length ? Math.round((paidDebts / debts.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
          <CardDescription>Dados cadastrais e de contato</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nome</p>
              <p className="text-base">{company.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">CNPJ</p>
              <p className="text-base">{company.cnpj}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base">{company.email || "Não informado"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Telefone</p>
              <p className="text-base">{company.phone || "Não informado"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Endereço</p>
              <p className="text-base">{company.address || "Não informado"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-4">
        <Link href={`/super-admin/empresas/${company.id}/base`} className="flex-1">
          <Button className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Importar Base de Clientes
          </Button>
        </Link>
        <Link href={`/super-admin/empresas/${company.id}/exportar`} className="flex-1">
          <Button variant="outline" className="w-full bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Exportar Base de Clientes
          </Button>
        </Link>
      </div>
    </div>
  )
}
