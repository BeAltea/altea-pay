"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { DynamicCustomerForm } from "@/components/dashboard/dynamic-customer-form"
import { createClient } from "@/lib/supabase/client"

export default function NovoClientePage() {
  const router = useRouter()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCompanyId() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

        if (profile?.company_id) {
          setCompanyId(profile.company_id)
        }
      }
      setLoading(false)
    }

    loadCompanyId()
  }, [])

  const handleSuccess = () => {
    router.push("/dashboard/clientes")
  }

  const handleCancel = () => {
    router.push("/dashboard/clientes")
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/clientes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cadastrar Novo Cliente</h1>
            <p className="text-muted-foreground">Carregando formulário...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/clientes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Erro</h1>
            <p className="text-muted-foreground">Não foi possível carregar os dados da empresa.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clientes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadastrar Novo Cliente</h1>
          <p className="text-muted-foreground">
            Preencha os dados do cliente. Os campos disponíveis são baseados na estrutura da sua empresa.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>Todos os campos são carregados dinamicamente da sua tabela de clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <DynamicCustomerForm companyId={companyId} onSuccess={handleSuccess} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </div>
  )
}
