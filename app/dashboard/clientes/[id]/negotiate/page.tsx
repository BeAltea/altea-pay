import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { profiles, vmax } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
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
  const session = await auth()
  const user = session?.user

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile
  const [profile] = await db
    .select({ companyId: profiles.companyId, fullName: profiles.fullName, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  if (!profile || !profile.companyId) {
    redirect("/dashboard")
  }

  // Get customer data from VMAX table
  const [customerData] = await db
    .select()
    .from(vmax)
    .where(eq(vmax.id, params.id))
    .limit(1)

  if (!customerData) {
    redirect("/dashboard/clientes")
  }

  // Format customer data
  const customer = {
    id: customerData.id,
    name: customerData.cliente || "",
    cpf: customerData.cpfCnpj || "",
    debtAmount: Number.parseFloat(customerData.valorTotal || "0"),
    daysOverdue: Number.parseInt(String(customerData.maiorAtraso || "0").replace(/\D/g, "")) || 0,
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
          <h1 className="text-3xl font-bold">Nova Negociacao</h1>
          <p className="text-muted-foreground">Crie uma proposta de acordo para o cliente</p>
        </div>

        <NegotiationFormClient customer={customer} />
      </div>
    </div>
  )
}
