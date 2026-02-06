import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { ArrowLeft, Save, TestTube } from "lucide-react"

interface NewERPIntegrationPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function NewERPIntegrationPage({ params }: NewERPIntegrationPageProps) {
  const { id } = await params
  const company = {
    id: id,
    name: "Enel Distribuição São Paulo",
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/super-admin/companies/${id}/erp-integration`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Nova Integração ERP</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-1">{company.name}</p>
        </div>
      </div>

      {/* Form */}
      <form className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>Configure os dados principais da integração</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="erp_name">Nome da Integração</Label>
                <Input id="erp_name" placeholder="Ex: TOTVS Protheus - Produção" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="erp_type">Tipo de ERP</Label>
                <Select>
                  <SelectTrigger id="erp_type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totvs">TOTVS Protheus</SelectItem>
                    <SelectItem value="sankhya">Sankhya</SelectItem>
                    <SelectItem value="omie">Omie</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_url">URL Base da API</Label>
              <Input id="base_url" type="url" placeholder="https://api.exemplo.com.br" />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="is_active" />
              <Label htmlFor="is_active">Integração ativa</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Autenticação</CardTitle>
            <CardDescription>Configure as credenciais de acesso à API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth_type">Tipo de Autenticação</Label>
              <Select>
                <SelectTrigger id="auth_type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="basic">Basic Auth</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auth_token">Token / Chave de Autenticação</Label>
              <Input id="auth_token" type="password" placeholder="••••••••••••••••" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endpoints</CardTitle>
            <CardDescription>Configure os endpoints da API do ERP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customers_endpoint">Endpoint de Clientes</Label>
              <Input id="customers_endpoint" placeholder="/api/customers" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="debts_endpoint">Endpoint de Dívidas</Label>
              <Input id="debts_endpoint" placeholder="/api/debts" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sync_endpoint">Endpoint de Sincronização</Label>
              <Input id="sync_endpoint" placeholder="/api/sync" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações de Sincronização</CardTitle>
            <CardDescription>Defina como e quando os dados serão sincronizados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sync_frequency">Frequência de Sincronização</Label>
              <Select>
                <SelectTrigger id="sync_frequency">
                  <SelectValue placeholder="Selecione a frequência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="hourly">A cada hora</SelectItem>
                  <SelectItem value="daily">Diariamente</SelectItem>
                  <SelectItem value="weekly">Semanalmente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="config">Configurações Adicionais (JSON)</Label>
              <Textarea
                id="config"
                placeholder='{"timeout": 30000, "retries": 3}'
                className="font-mono text-sm"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button type="button" variant="outline">
            <TestTube className="mr-2 h-4 w-4" />
            Testar Conexão
          </Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Salvar Integração
          </Button>
        </div>
      </form>
    </div>
  )
}
