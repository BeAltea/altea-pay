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
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
  const { data: customerData } = await serviceClient.from("VMAX").select("*").eq("id", id).single()

  if (!customerData) {
    redirect("/dashboard/clientes")
  }

  // Parse Vencido value (Brazilian format: "1.234,56" or "R$ 1.234,56")
  const vencidoStr = String(customerData.Vencido || "0")
  const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  const debtAmount = Number(cleanValue) || 0

  // Format customer data
  const customer = {
    id: customerData.id,
    name: customerData.Cliente || customerData.name || "N/A",
    cpf: customerData["CPF/CNPJ"] || customerData.cpf || "N/A",
    debtAmount: debtAmount,
    daysOverdue: Number.parseInt(String(customerData["Dias Inad."] || "0").replace(/\D/g, "")) || 0,
    email: customerData.Email || null,
    phone1: customerData["Telefone 1"] || null,
    phone2: customerData["Telefone 2"] || null,
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
