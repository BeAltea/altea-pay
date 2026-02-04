import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { eq, desc } from "drizzle-orm"
import { erpIntegrations, integrationLogs } from "@/lib/db/schema"
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
  const session = await auth()

  // Fetch integrations using Drizzle ORM
  const integrations = await db
    .select()
    .from(erpIntegrations)
    .where(eq(erpIntegrations.companyId, params.id))
    .orderBy(desc(erpIntegrations.createdAt))

  // Fetch recent logs using Drizzle ORM
  const logs = await db
    .select()
    .from(integrationLogs)
    .where(eq(integrationLogs.companyId, params.id))
    .orderBy(desc(integrationLogs.createdAt))
    .limit(10)

  // Mock data for company (should be fetched)
  const company = {
    id: params.id,
    name: "Enel Distribuicao Sao Paulo",
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Integracao ERP</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-1">{company.name}</p>
        </div>
        <Button asChild>
          <Link href={`/super-admin/companies/${params.id}/erp-integration/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Integracao
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integracoes Ativas</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations?.filter((i) => i.isActive).length || 0}</div>
            <p className="text-xs text-muted-foreground">de {integrations?.length || 0} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ultima Sincronizacao</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations?.[0]?.lastSyncAt
                ? new Date(integrations[0].lastSyncAt).toLocaleDateString("pt-BR")
                : "Nunca"}
            </div>
            <p className="text-xs text-muted-foreground">
              {integrations?.[0]?.lastSyncAt
                ? new Date(integrations[0].lastSyncAt).toLocaleTimeString("pt-BR")
                : "Nenhuma sincronizacao"}
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
              {logs?.reduce((acc, log) => acc + (log.recordsProcessed || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {logs?.reduce((acc, log) => acc + (log.recordsFailed || 0), 0) || 0} falhas
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
              {integrations?.some((i) => i.isActive) ? "Operacional" : "Inativo"}
            </div>
            <p className="text-xs text-muted-foreground">
              {logs?.filter((l) => l.status === "success").length || 0} sucessos recentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integracoes Configuradas */}
      <Card>
        <CardHeader>
          <CardTitle>Integracoes Configuradas</CardTitle>
          <CardDescription>Gerencie as integracoes com ERPs externos</CardDescription>
        </CardHeader>
        <CardContent>
          {!integrations || integrations.length === 0 ? (
            <div className="text-center py-12">
              <Plug className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Nenhuma integracao configurada</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Comece criando uma nova integracao com um ERP externo.
              </p>
              <Button asChild className="mt-6">
                <Link href={`/super-admin/companies/${params.id}/erp-integration/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Integracao
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
                          <h3 className="font-medium text-gray-900 dark:text-white">{integration.name}</h3>
                          <Badge variant={integration.isActive ? "default" : "secondary"} className="text-xs">
                            {integration.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline" className="text-xs uppercase">
                            {integration.erpType}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {(integration.config as any)?.baseUrl || "URL nao configurada"}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            Ultima sync:{" "}
                            {integration.lastSyncAt
                              ? new Date(integration.lastSyncAt).toLocaleString("pt-BR")
                              : "Nunca"}
                          </span>
                          <span>Frequencia: {(integration.config as any)?.syncFrequency || "manual"}</span>
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
            <CardTitle>Logs de Sincronizacao</CardTitle>
            <CardDescription>Historico das ultimas operacoes de integracao</CardDescription>
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
                        {log.action?.replace(/_/g, " ") || "Operacao"}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {log.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                      <span>{log.recordsProcessed || 0} processados</span>
                      <span className="text-green-600 dark:text-green-400">{(log.recordsProcessed || 0) - (log.recordsFailed || 0)} sucesso</span>
                      {(log.recordsFailed || 0) > 0 && (
                        <span className="text-red-600 dark:text-red-400">{log.recordsFailed} falhas</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString("pt-BR") : "N/A"}
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
