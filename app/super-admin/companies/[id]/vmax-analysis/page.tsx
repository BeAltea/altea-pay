import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, PlayCircle, Database, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"
import { runVMAXAnalysis } from "@/app/actions/credit-actions"

interface PageProps {
  params: Promise<{ id: string }>
}

async function VMAXAnalysisContent({ companyId }: { companyId: string }) {
  const supabase = createServerClient()

  // Buscar informações da empresa
  const { data: company } = await supabase.from("companies").select("*").eq("id", companyId).single()

  if (!company) {
    redirect("/super-admin/companies")
  }

  // Buscar estatísticas da tabela VMAX
  const { data: vmaxRecords, count: vmaxCount } = await supabase
    .from("VMAX")
    .select("*", { count: "exact" })
    .eq("id_company", companyId)

  // Buscar análises já realizadas
  const { data: existingAnalyses, count: analyzedCount } = await supabase
    .from("credit_profiles")
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .eq("source", "gov")

  // Buscar último log de execução
  const { data: lastLog } = await supabase
    .from("integration_logs")
    .select("*")
    .eq("integration_type", "vmax_auto_analysis")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  const pendingAnalysis = (vmaxCount || 0) - (analyzedCount || 0)

  async function handleRunAnalysis() {
    "use server"
    const result = await runVMAXAnalysis(companyId)
    return result
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/super-admin/companies/${companyId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Análise Automática VMAX</h1>
            <p className="text-muted-foreground">
              Executar análise gratuita (Portal da Transparência) para todos os clientes da {company.name}
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vmaxCount || 0}</div>
            <p className="text-xs text-muted-foreground">Registros na tabela VMAX</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Já Analisados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyzedCount || 0}</div>
            <p className="text-xs text-muted-foreground">Com análise em cache</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingAnalysis}</div>
            <p className="text-xs text-muted-foreground">Aguardando análise</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Execução</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastLog ? new Date(lastLog.created_at).toLocaleDateString("pt-BR") : "Nunca"}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastLog ? `${(lastLog.duration_ms / 1000).toFixed(1)}s` : "Nenhuma execução"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card de Execução */}
      <Card>
        <CardHeader>
          <CardTitle>Executar Análise Automática</CardTitle>
          <CardDescription>
            Esta ação irá processar todos os CPFs da tabela VMAX que ainda não possuem análise. A análise usa apenas a
            API gratuita do Portal da Transparência (governo).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="font-semibold mb-2">O que será feito:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Ler todos os {vmaxCount || 0} registros da tabela VMAX</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Verificar quais já possuem análise (cache) - {analyzedCount || 0} encontrados</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Processar {pendingAnalysis} CPFs pendentes em lotes de 5</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Consultar Portal da Transparência para cada CPF</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Salvar resultados em credit_profiles com source='gov'</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Registrar logs detalhados em integration_logs</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <h3 className="font-semibold text-orange-900 mb-2">⚠️ Importante:</h3>
            <ul className="space-y-1 text-sm text-orange-800">
              <li>• Esta análise usa apenas a API gratuita do Portal da Transparência</li>
              <li>• Não consome créditos da API Assertiva</li>
              <li>
                • Tempo estimado: ~{Math.ceil(pendingAnalysis / 5)}min para {pendingAnalysis} CPFs pendentes
              </li>
              <li>• CPFs já analisados serão ignorados (cache)</li>
            </ul>
          </div>

          <form action={handleRunAnalysis}>
            <Button type="submit" size="lg" className="w-full" disabled={pendingAnalysis === 0}>
              <PlayCircle className="mr-2 h-5 w-5" />
              {pendingAnalysis === 0
                ? "Todos os CPFs já foram analisados"
                : `Executar Análise (${pendingAnalysis} CPFs)`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Último Log */}
      {lastLog && (
        <Card>
          <CardHeader>
            <CardTitle>Última Execução</CardTitle>
            <CardDescription>Detalhes da última análise automática executada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">{new Date(lastLog.created_at).toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium capitalize">{lastLog.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duração:</span>
                <span className="font-medium">{(lastLog.duration_ms / 1000).toFixed(2)}s</span>
              </div>
              {lastLog.response_data && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Analisados:</span>
                    <span className="font-medium">{lastLog.response_data.analyzed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cache:</span>
                    <span className="font-medium">{lastLog.response_data.cached || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Falhas:</span>
                    <span className="font-medium">{lastLog.response_data.failed || 0}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default async function VMAXAnalysisPage({ params }: PageProps) {
  const { id } = await params

  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <VMAXAnalysisContent companyId={id} />
    </Suspense>
  )
}
