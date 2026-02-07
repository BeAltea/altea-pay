import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminDividasContent } from "@/components/dashboard/admin-dividas-content"

export const dynamic = "force-dynamic"

export default async function DividasPage() {
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

  // Fetch all VMAX records with debt info
  let vmaxRecords: any[] = []
  let page = 0
  const pageSize = 1000

  while (true) {
    const { data: pageData } = await supabase
      .from("VMAX")
      .select("*")
      .eq("id_company", companyId)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (!pageData || pageData.length === 0) break
    vmaxRecords = [...vmaxRecords, ...pageData]
    if (pageData.length < pageSize) break
    page++
  }

  // Transform VMAX records to debt format
  const dividas = vmaxRecords.map((record: any) => {
    const vencidoStr = String(record.Vencido || "0")
    const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
    const amount = Number(cleanValue) || 0

    const diasInad = Number(String(record["Dias Inad."] || "0").replace(/\./g, "")) || 0

    // Parse due date
    let dueDate: Date | null = null
    if (record["Data Vencimento"]) {
      const parts = record["Data Vencimento"].split("/")
      if (parts.length === 3) {
        dueDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]))
      }
    }

    // Determine status
    let status = "em_aberto"
    if (record["DT Cancelamento"]) {
      status = "quitada"
    } else if (record.approval_status === "ACEITA" || record.approval_status === "ACEITA_ESPECIAL") {
      status = "em_negociacao"
    }

    return {
      id: record.id,
      cliente: record.Cliente,
      cpfCnpj: record["CPF/CNPJ"],
      valor: amount,
      dataVencimento: dueDate,
      diasAtraso: diasInad,
      status,
      cidade: record.Cidade,
      uf: record.UF,
    }
  })

  return <AdminDividasContent dividas={dividas} company={company} />
}
