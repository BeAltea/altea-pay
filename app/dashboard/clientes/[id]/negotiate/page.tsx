import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { redirect } from "next/navigation"
import { NegotiationFormClient } from "@/components/dashboard/negotiation-form-client"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function NegotiatePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, full_name, role")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.company_id) {
    redirect("/dashboard")
  }

  // Get customer data from VMAX table using service client
  const { data: customerData } = await serviceClient.from("VMAX").select("*").eq("id", params.id).single()

  if (!customerData) {
    redirect("/dashboard/clientes")
  }

  // Format customer data
  const customer = {
    id: customerData.id,
    name: customerData.Cliente || customerData.name,
    cpf: customerData["CPF/CNPJ"] || customerData.cpf,
    debtAmount: Number.parseFloat(customerData.Vencido || customerData.debt_amount || "0"),
    daysOverdue: Number.parseInt(customerData["Dias Inad."] || customerData.days_overdue || "0"),
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/dashboard/clientes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Clientes
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Nova Negociação</h1>
          <p className="text-muted-foreground">Crie uma proposta de acordo para o cliente</p>
        </div>

        <NegotiationFormClient customer={customer} />
      </div>
    </div>
  )
}
