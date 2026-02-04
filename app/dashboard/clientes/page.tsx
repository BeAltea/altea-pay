import { db } from "@/lib/db"
import { auth } from "@/lib/auth/config"
import { profiles, companies, vmax } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { ClientesContent } from "@/components/dashboard/clientes-content"
import { getAllBehavioralAnalyses } from "@/app/actions/get-all-behavioral-analyses"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  try {
    const session = await auth()
    const user = session?.user

    if (!user) {
      redirect("/auth/login")
    }

    const [profileData] = await db
      .select({
        companyId: profiles.companyId,
        role: profiles.role,
        fullName: profiles.fullName,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1)

    if (!profileData?.companyId) {
      return <div className="p-4 md:p-8">Empresa não encontrada para o usuário</div>
    }

    const [company] = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.id, profileData.companyId))
      .limit(1)

    // Buscar TODOS os registros da empresa
    const vmaxCustomers = await db
      .select()
      .from(vmax)
      .where(eq(vmax.idCompany, profileData.companyId))

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
