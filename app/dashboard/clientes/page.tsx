import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye, Sparkles, Plus } from "lucide-react"

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
      return <div className="p-8">Empresa não encontrada para o usuário</div>
    }

    const { data: company } = await supabase.from("companies").select("id, name").eq("id", profile.company_id).single()

    const { data: vmaxCustomers, error: vmaxError } = await supabase
      .from("VMAX")
      .select("*")
      .eq("id_company", profile.company_id)

    const clientes = vmaxCustomers || []

    const comAnalise = clientes.filter((c) => c.analysis_metadata !== null).length

    return (
      <div className="flex flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">
              Todos os clientes da empresa {company?.name} | {comAnalise} com análise de crédito
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {clientes.length} clientes
            </Badge>
            <Button asChild>
              <Link href="/dashboard/clientes/novo">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Cliente
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientes.map((cliente) => (
            <Card key={cliente.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-start justify-between gap-2">
                  <span className="line-clamp-2">{cliente.Cliente || "N/A"}</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground font-mono">{cliente["CPF/CNPJ"] || "N/A"}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {cliente.credit_score && (
                  <div className="border rounded-lg p-3 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="text-xs text-purple-600 font-semibold">Score de Crédito</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-600">{cliente.credit_score}</div>
                    <p className="text-xs text-muted-foreground mt-1">Análise de Crédito</p>
                  </div>
                )}

                {cliente.approval_status && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded bg-muted">
                      <span className="text-muted-foreground">Risco:</span>
                      <Badge
                        variant={
                          cliente.approval_status === "ACEITA"
                            ? "default"
                            : cliente.approval_status === "ACEITA_ESPECIAL"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {cliente.approval_status === "ACEITA"
                          ? "medium"
                          : cliente.approval_status === "REJEITA"
                            ? "very_high"
                            : "high"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-muted">
                      <span className="text-muted-foreground">Sanções:</span>
                      <Badge variant="destructive">{cliente.sanctions_count || 0}</Badge>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cidade:</span>
                  <span className="font-medium">{cliente.Cidade || "N/A"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">UF:</span>
                  <span className="font-medium">{cliente.UF || "N/A"}</span>
                </div>

                {cliente.Dias_Inad && cliente.Dias_Inad > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dias Inadimplência:</span>
                    <Badge
                      variant="destructive"
                      className={
                        cliente.Dias_Inad <= 30
                          ? "bg-yellow-500"
                          : cliente.Dias_Inad <= 60
                            ? "bg-orange-500"
                            : cliente.Dias_Inad <= 90
                              ? "bg-red-500"
                              : "bg-red-700"
                      }
                    >
                      {cliente.Dias_Inad} dias
                    </Badge>
                  </div>
                )}

                {cliente.Vencido && Number.parseFloat(cliente.Vencido.toString().replace(",", ".")) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor Vencido:</span>
                    <span className="font-semibold text-red-600">
                      R$ {Number.parseFloat(cliente.Vencido.toString().replace(",", ".")).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t">
                  <Button asChild variant="outline" size="sm" className="w-full gap-2 bg-transparent">
                    <Link href={`/dashboard/clientes/${cliente.id}`}>
                      <Eye className="h-4 w-4" />
                      Ver Detalhes Completos
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {clientes.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum cliente encontrado para esta empresa</p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  } catch (error) {
    console.error("[v0] ❌ Erro na página de clientes:", error)
    return (
      <div className="p-8">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Erro ao carregar clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro ao carregar os clientes. Detalhes:{" "}
              {error instanceof Error ? error.message : "Erro desconhecido"}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
}
