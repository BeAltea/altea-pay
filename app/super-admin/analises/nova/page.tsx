import { Suspense } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { profiles } from "@/lib/db/schema"
import NewAnalysisForm from "@/components/super-admin/new-analysis-form"

export default async function NovaAnalisePage() {
  const session = await auth()
  const user = session?.user

  if (!user) {
    redirect("/auth/login")
  }

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  if (profile?.role !== "super_admin") {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Nova Analise Assertiva</h1>
        <p className="text-muted-foreground mb-8">
          Execute analise comportamental completa (assincrona) para CPF ou CNPJ. O resultado sera processado em 2-5
          minutos.
        </p>

        <Suspense fallback={<div>Carregando...</div>}>
          <NewAnalysisForm />
        </Suspense>
      </div>
    </div>
  )
}
