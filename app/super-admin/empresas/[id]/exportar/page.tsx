import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { exportCustomerBase } from "@/app/actions/credit-actions"

export default async function ExportarBasePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Busca dados da empresa
  const { data: company } = await supabase.from("companies").select("*").eq("id", params.id).single()

  if (!company) {
    notFound()
  }

  // Busca clientes
  const { data: customers } = await supabase.from("customers").select("*").eq("company_id", params.id)

  async function handleExport(formData: FormData) {
    "use server"
    const includeCreditData = formData.get("includeCreditData") === "true"
    return await exportCustomerBase(params.id, includeCreditData)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/super-admin/empresas/${params.id}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Exportar Base de Clientes</h1>
          <p className="text-muted-foreground">{company.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exportar Clientes</CardTitle>
          <CardDescription>Baixe a base de clientes em formato CSV</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium mb-2">Total de clientes: {customers?.length || 0}</p>
            <p className="text-sm text-muted-foreground">
              O arquivo CSV conterá todos os dados dos clientes incluindo nome, documento, email, telefone e endereço.
            </p>
          </div>

          <form action={handleExport} className="space-y-4">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="includeCreditData" name="includeCreditData" value="true" className="h-4 w-4" />
              <label htmlFor="includeCreditData" className="text-sm font-medium">
                Incluir dados de análise de crédito
              </label>
            </div>

            <Button type="submit" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Baixar CSV
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
