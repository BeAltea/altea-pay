import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminClientesContent } from "@/components/dashboard/admin-clientes-content"
import { getAllBehavioralAnalyses } from "@/app/actions/get-all-behavioral-analyses"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      redirect("/auth/login")
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role, full_name")
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

    const { data: company } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", profile.company_id)
      .single()

    // Fetch all VMAX records for this company
    let vmaxCustomers: any[] = []
    let page = 0
    const pageSize = 1000

    while (true) {
      const { data: pageData, error: vmaxError } = await supabase
        .from("VMAX")
        .select("*")
        .eq("id_company", profile.company_id)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (vmaxError || !pageData || pageData.length === 0) break
      vmaxCustomers = [...vmaxCustomers, ...pageData]
      if (pageData.length < pageSize) break
      page++
    }

    // Get behavioral analyses
    const behavioralRes = await getAllBehavioralAnalyses()
    const allBehavioralAnalyses = behavioralRes.success ? behavioralRes.data : []

    // Create map for quick lookup
    const behavioralMap = new Map()
    if (allBehavioralAnalyses) {
      allBehavioralAnalyses.forEach((analysis: any) => {
        if (analysis.cpf) {
          const cleanCpf = analysis.cpf.replace(/[^\d]/g, "")
          behavioralMap.set(cleanCpf, analysis)
        }
      })
    }

    // Enrich customer data with behavioral analysis
    const clientes = (vmaxCustomers || []).map((cliente: any) => {
      const cpfCnpj = cliente["CPF/CNPJ"]?.replace(/[^\d]/g, "")
      const behavioralData = cpfCnpj ? behavioralMap.get(cpfCnpj) : null

      return {
        ...cliente,
        behavioralData,
      }
    })

    return <AdminClientesContent clientes={clientes} company={company} />
  } catch (error) {
    console.error("Error loading clients:", error)
    return (
      <div
        className="p-6 rounded-xl"
        style={{ background: "var(--admin-red-bg)", border: "1px solid var(--admin-red)" }}
      >
        <h3 className="font-semibold mb-2" style={{ color: "var(--admin-red)" }}>
          Erro ao carregar clientes
        </h3>
        <p className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
          {error instanceof Error ? error.message : "Erro desconhecido"}
        </p>
      </div>
    )
  }
}
