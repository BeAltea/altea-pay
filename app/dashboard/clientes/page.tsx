import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ClientesContent } from "@/components/dashboard/clientes-content"

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

    const { data: company } = await supabase.from("companies").select("id, name").eq("id", profile.company_id).single()

    const { data: vmaxCustomers, error: vmaxError } = await supabase
      .from("VMAX")
      .select("*")
      .eq("id_company", profile.company_id)

    const clientes = vmaxCustomers || []

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
