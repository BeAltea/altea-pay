import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { vmax, companies } from "@/lib/db/schema"
import { CustomersFilterClient } from "@/components/super-admin/customers-filter-client"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"

export default async function ManageCustomersPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const user = session?.user

  if (!user) {
    notFound()
  }

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, params.id))
    .limit(1)

  if (!company) {
    notFound()
  }

  // Fetch all VMAX records for this company
  const vmaxCustomers = await db
    .select()
    .from(vmax)
    .where(eq(vmax.idCompany, params.id))

  console.log("[v0] TOTAL VMAX customers loaded:", vmaxCustomers.length)

  const vmaxProcessed = (vmaxCustomers || []).map((vmaxRecord) => {
    // Access metadata for additional fields not in schema
    const metadata = vmaxRecord.analysisMetadata as any

    // Get Vencido value - try valorTotal first, then metadata
    const vencidoStr = String(vmaxRecord.valorTotal || metadata?.Vencido || "0")
    const vencidoValue = Number(vencidoStr.replace(/[^\d,]/g, "").replace(",", "."))

    // Get Dias Inad. - try maiorAtraso first, then metadata
    const diasInadStr = String(vmaxRecord.maiorAtraso || metadata?.["Dias Inad."] || "0")
    const diasInad = Number(diasInadStr.replace(/\./g, "")) || 0

    // Get dates
    const primeiraVencida = vmaxRecord.primeiraVencida || metadata?.Vecto
    const dtCancelamento = metadata?.["DT Cancelamento"]

    let status: "active" | "overdue" | "negotiating" | "paid" = "active"
    if (diasInad > 0) {
      status = "overdue"
    } else if (dtCancelamento) {
      status = "paid"
    }

    return {
      id: vmaxRecord.id || `vmax-${Math.random()}`,
      name: vmaxRecord.cliente || "Cliente VMAX",
      email: null,
      phone: null,
      document: vmaxRecord.cpfCnpj || "N/A",
      company_id: params.id,
      created_at: primeiraVencida || new Date().toISOString(),
      totalDebt: vencidoValue,
      overdueDebt: diasInad > 0 ? vencidoValue : 0,
      lastPayment: dtCancelamento || primeiraVencida || new Date().toISOString(),
      status,
      city: vmaxRecord.cidade || null,
      daysOverdue: diasInad,
    }
  })

  // Use only VMAX data
  const allCustomers = vmaxProcessed

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

      <CustomersFilterClient customers={allCustomers} companyId={params.id} />
    </div>
  )
}
