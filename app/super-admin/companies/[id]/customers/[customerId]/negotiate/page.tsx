import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { vmax, companies } from "@/lib/db/schema"
import { redirect } from "next/navigation"
import { NegotiationForm } from "@/components/super-admin/negotiation-form"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function SuperAdminNegotiatePage({
  params,
}: {
  params: { id: string; customerId: string }
}) {
  const session = await auth()
  const user = session?.user

  if (!user) {
    redirect("/auth/login")
  }

  // Get customer data from VMAX
  const [customer] = await db
    .select()
    .from(vmax)
    .where(eq(vmax.id, params.customerId))
    .limit(1)

  if (!customer) {
    redirect(`/super-admin/companies/${params.id}`)
  }

  // Get company data
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, params.id))
    .limit(1)

  // Access metadata for additional fields
  const metadata = customer.analysisMetadata as any

  // Parse Vencido value - try valorTotal first, then metadata
  const vencidoStr = String(customer.valorTotal || metadata?.Vencido || "0")
  const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  const totalDebt = Number(cleanValue) || 0

  // Get days overdue
  const diasInadStr = String(customer.maiorAtraso || metadata?.["Dias Inad."] || "0")
  const daysOverdue = Number(diasInadStr.replace(/\D/g, "")) || 0

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
      <Link
        href={`/super-admin/companies/${params.id}/customers`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para clientes
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Nova Negociacao</h1>
        <p className="text-muted-foreground">
          Criar proposta de acordo para <span className="font-medium text-foreground">{customer.cliente}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Cliente</p>
              <h3 className="text-xl font-bold">{customer.cliente}</h3>
              <p className="text-sm text-muted-foreground">{customer.cpfCnpj}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Empresa</p>
              <h3 className="text-xl font-bold">{company?.name || "N/A"}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Valor Total</p>
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">
                R$ {totalDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400">{daysOverdue} dias em atraso</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border-t pt-6">
        <NegotiationForm
          customerId={params.customerId}
          companyId={params.id}
          totalDebt={totalDebt}
          customerName={customer.cliente || ""}
          isSuperAdmin={true}
        />
      </div>
    </div>
  )
}
