import { createAdminClient } from "@/lib/supabase/admin"
import { ImportBaseWizard } from "@/components/super-admin/import-base-wizard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function EmpresaBasePage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  console.log("[v0] 📂 Carregando página de base da empresa:", params.id)

  const { data: company } = await supabase.from("companies").select("*").eq("id", params.id).single()

  if (!company) {
    notFound()
  }

  const { count: customerCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("company_id", params.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/super-admin/empresas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Gestão de Base - {company.name}</h1>
          <p className="text-muted-foreground">
            Importe ou exporte a base de clientes e faturas • {customerCount || 0} clientes cadastrados
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ImportBaseWizard companyId={params.id} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Base
            </CardTitle>
            <CardDescription>Baixe a base atual de clientes em formato CSV</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button className="w-full bg-transparent" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar Clientes (CSV)
              </Button>
              <Button className="w-full bg-transparent" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar Faturas (CSV)
              </Button>
              <Button className="w-full bg-transparent" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar Tudo (ZIP)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
