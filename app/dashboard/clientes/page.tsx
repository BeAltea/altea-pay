import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ClientesContent } from "@/components/dashboard/clientes-content"
import { getAllBehavioralAnalyses } from "@/app/actions/get-all-behavioral-analyses"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      redirect("/auth/login")
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id, role, full_name")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return <div className="p-4 md:p-8">Empresa não encontrada para o usuário</div>
    }

    console.log("[v0] ClientesPage - profile.company_id:", profile.company_id)

    const { data: company } = await supabase.from("companies").select("id, name").eq("id", profile.company_id).single()

    // Buscar TODOS os registros da empresa (sem limite de 1000)
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
    
    console.log("[v0] ClientesPage - Total VMAX customers:", vmaxCustomers.length)

    const behavioralRes = await getAllBehavioralAnalyses()
    const allBehavioralAnalyses = behavioralRes.success ? behavioralRes.data : []

    const behavioralMap = new Map()
    if (allBehavioralAnalyses) {
      allBehavioralAnalyses.forEach((analysis) => {
        if (analysis.cpf) {
          const cleanCpf = analysis.cpf.replace(/[^\d]/g, "")
          behavioralMap.set(cleanCpf, analysis)
        }
      })
    }

    const clientes = (vmaxCustomers || []).map((cliente) => {
      const cpfCnpj = cliente["CPF/CNPJ"]?.replace(/[^\d]/g, "")
      const behavioralData = cpfCnpj ? behavioralMap.get(cpfCnpj) : null

      return {
        ...cliente,
        behavioralData,
      }
    })

    return <ClientesContent clientes={clientes} company={company} />
  } catch (error) {
    console.error("Erro na página de clientes:", error)
    return (
      <div className="p-4 md:p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-600">Erro ao carregar clientes</h3>
          <p className="text-sm text-red-500 mt-2">
            Ocorreu um erro ao carregar os clientes. Detalhes:{" "}
            {error instanceof Error ? error.message : "Erro desconhecido"}
          </p>
        </div>
      </div>
    )
  }
}
