"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { DynamicCustomerForm } from "@/components/dashboard/dynamic-customer-form"
import { getCompanyTableName } from "@/app/actions/multi-tenant-actions"

interface NewClientPageProps {
  params: {
    id: string
  }
}

export default function NewClientPage({ params }: NewClientPageProps) {
  const { id } = params
  const router = useRouter()
  const [companyInfo, setCompanyInfo] = useState<{ name: string; tableName: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCompanyInfo() {
      const result = await getCompanyTableName(id)
      if (result.success && result.companyName && result.tableName) {
        setCompanyInfo({ name: result.companyName, tableName: result.tableName })
      }
      setLoading(false)
    }
    loadCompanyInfo()
  }, [id])

  const handleSuccess = () => {
    router.push(`/super-admin/companies/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!companyInfo) {
    return (
      <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/super-admin/companies/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Erro</h1>
            <p className="text-muted-foreground">Empresa não encontrada ou sem tabela configurada.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/super-admin/companies/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadastrar Novo Cliente</h1>
          <p className="text-muted-foreground">
            Empresa: <span className="font-semibold">{companyInfo.name}</span> | Tabela:{" "}
            <span className="font-mono text-sm">{companyInfo.tableName}</span>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>Formulário dinâmico baseado na estrutura da tabela {companyInfo.tableName}</CardDescription>
        </CardHeader>
        <CardContent>
          <DynamicCustomerForm
            companyId={id}
            onSuccess={handleSuccess}
            onCancel={() => router.push(`/super-admin/companies/${id}`)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
