import { createAdminClient } from "@/lib/supabase/server"
import { ImportarDadosClient } from "@/components/super-admin/importar-dados-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

async function fetchCompanies() {
  const supabase = createAdminClient()

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name")
    .order("name")

  if (error) {
    console.error("[Importar Dados] Error fetching companies:", error)
    return []
  }

  return companies || []
}

export default async function ImportarDadosPage() {
  const companies = await fetchCompanies()

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar Dados</h1>
        <p className="text-muted-foreground">
          Importe clientes de arquivos CSV ou Excel com sanitização e deduplicação automática.
        </p>
      </div>

      <ImportarDadosClient companies={companies} />
    </div>
  )
}
