import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SyncButtons } from "@/components/erp/sync-buttons"
import Link from "next/link"
import { ArrowLeft, Plus, Plug, CheckCircle, XCircle, Clock, Settings, AlertTriangle, Activity } from "lucide-react"
import { CreditAnalysisIntegration } from "@/components/erp/credit-analysis-integration"

interface ERPIntegrationPageProps {
  params: {
    id: string
  }
}

export default async function ERPIntegrationPage({ params }: ERPIntegrationPageProps) {
  const supabase = await createClient()

  // Busca integrações da empresa
  const { data: integrations, error } = await supabase
    .from("erp_integrations")
    .select("*")
    .eq("company_id", params.id)
    .order("created_at", { ascending: false })

  // Busca logs recentes
  const { data: logs } = await supabase
    .from("integration_logs")
    .select("*")
    .eq("company_id", params.id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Mock data para empresa
  const company = {
    id: params.id,
    name: "Enel Distribuição São Paulo",
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/super-admin/companies/${params.id}`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Integração ERP</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-1">{company.name}</p>
        </div>
        <Button asChild>
          <Link href={`/super-admin/companies/${params.id}/erp-integration/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Integração
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrações Ativas</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations?.filter((i) => i.is_active).length || 0}</div>
            <p className="text-xs text-muted-foreground">de {integrations?.length || 0} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Sincronização</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations?.[0]?.last_sync_at
                ? new Date(integrations[0].last_sync_at).toLocaleDateString("pt-BR")
                : "Nunca"}
            </div>
            <p className="text-xs text-muted-foreground">
              {integrations?.[0]?.last_sync_at
                ? new Date(integrations[0].last_sync_at).toLocaleTimeString("pt-BR")
                : "Nenhuma sincronização"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros Sincronizados</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs?.reduce((acc, log) => acc + (log.records_success || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {logs?.reduce((acc, log) => acc + (log.records_failed || 0), 0) || 0} falhas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations?.some((i) => i.is_active) ? "Operacional" : "Inativo"}
            </div>
            <p className="text-xs text-muted-foreground">
              {logs?.filter((l) => l.status === "success").length || 0} sucessos recentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integrações Configuradas */}
      <Card>
        <CardHeader>
          <CardTitle>Integrações Configuradas</CardTitle>
          <CardDescription>Gerencie as integrações com ERPs externos</CardDescription>
        </CardHeader>
        <CardContent>
          {!integrations || integrations.length === 0 ? (
            <div className="text-center py-12">
              <Plug className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Nenhuma integração configurada</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Comece criando uma nova integração com um ERP externo.
              </p>
              <Button asChild className="mt-6">
                <Link href={`/super-admin/companies/${params.id}/erp-integration/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Integração
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex flex-col space-y-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-4 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <div className="bg-altea-gold/10 p-3 rounded-lg">
                          <Plug className="h-6 w-6 text-altea-navy dark:text-altea-gold" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">{integration.erp_name}</h3>
                          <Badge variant={integration.is_active ? "default" : "secondary"} className="text-xs">
                            {integration.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline" className="text-xs uppercase">
                            {integration.erp_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{integration.base_url}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            Última sync:{" "}
                            {integration.last_sync_at
                              ? new Date(integration.last_sync_at).toLocaleString("pt-BR")
                              : "Nunca"}
                          </span>
                          <span>Frequência: {integration.sync_frequency}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/super-admin/companies/${params.id}/erp-integration/${integration.id}`}>
                          <Settings className="h-4 w-4 mr-1" />
                          Configurar
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <SyncButtons integrationId={integration.id} companyId={params.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreditAnalysisIntegration companyId={params.id} />

      {/* Logs Recentes */}
      {logs && logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Logs de Sincronização</CardTitle>
            <CardDescription>Histórico das últimas operações de integração</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center space-x-3 sm:space-x-4 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {log.status === "success" && (
                      <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-full">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                    {log.status === "error" && (
                      <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-full">
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                    {log.status === "warning" && (
                      <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-full">
                        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                    )}
                    {log.status === "in_progress" && (
                      <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full">
                        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {log.operation_type.replace(/_/g, " ")}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {log.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                      <span>{log.records_processed} processados</span>
                      <span className="text-green-600 dark:text-green-400">{log.records_success} sucesso</span>
                      {log.records_failed > 0 && (
                        <span className="text-red-600 dark:text-red-400">{log.records_failed} falhas</span>
                      )}
                      <span>{log.duration_ms}ms</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
