import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NegotiationForm } from "@/components/dashboard/negotiation-form"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function CompanyNegotiatePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  // Get user profile to get company_id
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/signin")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile?.company_id) {
    redirect("/dashboard")
  }

  // Get customer data
  const { data: customer } = await supabase
    .from("VMAX")
    .select("*")
    .eq("id", params.id)
    .eq("id_company", profile.company_id)
    .single()

  if (!customer) {
    redirect("/dashboard/clientes")
  }

  // Parse Vencido value
  const vencidoStr = String(customer.Vencido || "0")
  const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  const totalDebt = Number(cleanValue) || 0

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
      <Link
        href={`/dashboard/clientes/${params.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para cliente
      </Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Nova Negociação</h1>
        <p className="text-muted-foreground">
          Criar proposta de acordo para <span className="font-medium text-foreground">{customer.Cliente}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Cliente</p>
              <h3 className="text-xl font-bold">{customer.Cliente}</h3>
              <p className="text-sm text-muted-foreground">{customer["CPF/CNPJ"]}</p>
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
              <p className="text-sm text-red-700 dark:text-red-400">{customer.Dias_Inad || 0} dias em atraso</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border-t pt-6">
        <NegotiationForm
          customerId={params.id}
          companyId={profile.company_id}
          totalDebt={totalDebt}
          customerName={customer.Cliente}
          isSuperAdmin={false}
        />
      </div>
    </div>
  )
}
