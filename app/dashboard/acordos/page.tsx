import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminAcordosContent } from "@/components/dashboard/admin-acordos-content"

export const dynamic = "force-dynamic"

export default async function AcordosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.company_id) {
    return (
      <div
        className="p-6 rounded-xl"
        style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
      >
        <p style={{ color: "var(--admin-text-secondary)" }}>
          Empresa nao encontrada para o usuario
        </p>
      </div>
    )
  }

  const companyId = profile.company_id

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .single()

  // Fetch all agreements for this company
  const { data: agreements } = await supabase
    .from("agreements")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })

  // Fetch customer info for each agreement (check both VMAX and customers tables)
  const customerIds = [...new Set((agreements || []).map((a: any) => a.customer_id).filter(Boolean))]
  let customerMap = new Map<string, { name: string | null; cpfCnpj: string | null; daysOverdue: number }>()

  if (customerIds.length > 0) {
    // First try VMAX table
    const { data: vmaxCustomers } = await supabase
      .from("VMAX")
      .select("id, Cliente, \"CPF/CNPJ\", \"Dias Inad.\"")
      .in("id", customerIds)

    if (vmaxCustomers) {
      vmaxCustomers.forEach((c: any) => {
        const diasInadStr = String(c["Dias Inad."] || "0")
        const daysOverdue = Number(diasInadStr.replace(/\./g, "")) || 0
        customerMap.set(c.id, { name: c.Cliente, cpfCnpj: c["CPF/CNPJ"], daysOverdue })
      })
    }

    // For any customer_ids not found in VMAX, try customers table
    const missingIds = customerIds.filter(id => !customerMap.has(id))
    if (missingIds.length > 0) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, document")
        .in("id", missingIds)

      if (customers) {
        customers.forEach((c: any) => {
          customerMap.set(c.id, { name: c.name, cpfCnpj: c.document, daysOverdue: 0 })
        })
      }
    }
  }

  // Enrich agreements with customer info
  const acordos = (agreements || []).map((agreement: any) => {
    const customer = customerMap.get(agreement.customer_id) || { name: null, cpfCnpj: null, daysOverdue: 0 }
    return {
      id: agreement.id,
      customerId: agreement.customer_id,
      customerName: customer.name,
      customerCpfCnpj: customer.cpfCnpj,
      originalAmount: Number(agreement.original_amount) || 0,
      agreedAmount: Number(agreement.agreed_amount) || 0,
      paidAmount: 0, // TODO: Calculate from payments
      installments: agreement.installments || 1,
      paidInstallments: agreement.status === "completed" ? (agreement.installments || 1) : 0, // TODO: Calculate from payments
      status: agreement.status || "draft",
      paymentStatus: agreement.payment_status || "pending",
      createdAt: agreement.created_at,
      firstDueDate: agreement.first_due_date,
      daysOverdue: customer.daysOverdue,
    }
  })

  return <AdminAcordosContent acordos={acordos} company={company} />
}
