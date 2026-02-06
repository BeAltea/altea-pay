import { createAdminClient } from "@/lib/supabase/admin"
import { CustomersFilterClient } from "@/components/super-admin/customers-filter-client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"

export default async function ManageCustomersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single()

  if (companyError || !company) {
    notFound()
  }

  // Buscar SOMENTE da tabela VMAX (tabela customers foi descontinuada)
  let vmaxCustomers: any[] = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const { data: vmaxPage, error: vmaxPageError } = await supabase
      .from("VMAX")
      .select("*")
      .eq("id_company", id)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (vmaxPageError) {
      console.log("[v0] VMAX page error:", vmaxPageError.message)
      break
    }

    console.log(`[v0] VMAX customers page ${page}: ${vmaxPage?.length || 0} records`)

    if (vmaxPage && vmaxPage.length > 0) {
      vmaxCustomers = [...vmaxCustomers, ...vmaxPage]
      page++
      hasMore = vmaxPage.length === pageSize
    } else {
      hasMore = false
    }
  }

  console.log("[v0] TOTAL VMAX customers loaded (after pagination):", vmaxCustomers.length)

  const vmaxProcessed = (vmaxCustomers || []).map((vmax) => {
    const vencidoStr = String(vmax.Vencido || vmax.vencido || "0")
    const vencidoValue = Number(vencidoStr.replace(/[^\d,]/g, "").replace(",", "."))
    // Remove ponto usado como separador de milhar no formato brasileiro
    const diasInadStr = String(vmax["Dias Inad."] || vmax.dias_inad || "0")
    const diasInad = Number(diasInadStr.replace(/\./g, "")) || 0
    const primeiraVencida = vmax.Vecto || vmax.primeira_vencida
    const dtCancelamento = vmax["DT Cancelamento"] || vmax.dt_cancelamento

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
      company_id: id,
      created_at: primeiraVencida || new Date().toISOString(),
      totalDebt: vencidoValue,
      overdueDebt: diasInad > 0 ? vencidoValue : 0,
      lastPayment: dtCancelamento || primeiraVencida || new Date().toISOString(),
      status,
      city: vmax.Cidade || vmax.cidade || null,
      daysOverdue: diasInad,
    }
  })

  // Usar SOMENTE dados da tabela VMAX
  const allCustomers = vmaxProcessed

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Clientes da Empresa</h1>
          <p className="text-gray-600 dark:text-gray-400">{company.name}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/super-admin/companies/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <CustomersFilterClient customers={allCustomers} companyId={id} />
    </div>
  )
}
