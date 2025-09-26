import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Settings, Mail, Shield, Database, Bell, Key, Server, CreditCard, AlertTriangle } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações globais do sistema</p>
        </div>
        <Button>Salvar Alterações</Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="billing">Cobrança</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="advanced">Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Gerais
              </CardTitle>
              <CardDescription>Configurações básicas da plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platform-name">Nome da Plataforma</Label>
                  <Input id="platform-name" defaultValue="CobrançaAuto" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform-url">URL da Plataforma</Label>
                  <Input id="platform-url" defaultValue="https://cobrancaauto.com" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform-description">Descrição</Label>
                <Textarea
                  id="platform-description"
                  defaultValue="Sistema completo de gestão de cobranças automatizadas"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Select defaultValue="america/sao_paulo">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="america/sao_paulo">América/São Paulo</SelectItem>
                      <SelectItem value="america/new_york">América/Nova York</SelectItem>
                      <SelectItem value="europe/london">Europa/Londres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma Padrão</Label>
                  <Select defaultValue="pt-br">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-br">Português (Brasil)</SelectItem>
                      <SelectItem value="en-us">English (US)</SelectItem>
                      <SelectItem value="es-es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Configurações de Sistema</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Modo de Manutenção</Label>
                      <p className="text-sm text-muted-foreground">Ativar modo de manutenção para todos os usuários</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Registro de Novos Usuários</Label>
                      <p className="text-sm text-muted-foreground">Permitir que novos usuários se registrem</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Logs Detalhados</Label>
                      <p className="text-sm text-muted-foreground">Ativar logs detalhados do sistema</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Segurança
              </CardTitle>
              <CardDescription>Gerencie as políticas de segurança da plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Políticas de Senha</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="min-password-length">Comprimento Mínimo</Label>
                    <Input id="min-password-length" type="number" defaultValue="8" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-expiry">Expiração (dias)</Label>
                    <Input id="password-expiry" type="number" defaultValue="90" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Exigir Caracteres Especiais</Label>
                      <p className="text-sm text-muted-foreground">
                        Senhas devem conter pelo menos um caractere especial
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Exigir Números</Label>
                      <p className="text-sm text-muted-foreground">Senhas devem conter pelo menos um número</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Autenticação</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Forçar 2FA para Admins</Label>
                      <p className="text-sm text-muted-foreground">
                        Exigir autenticação de dois fatores para administradores
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Timeout de Sessão</Label>
                      <p className="text-sm text-muted-foreground">Tempo limite para sessões inativas (minutos)</p>
                    </div>
                    <Input className="w-20" type="number" defaultValue="30" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Rate Limiting</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="api-rate-limit">Limite API (req/min)</Label>
                    <Input id="api-rate-limit" type="number" defaultValue="100" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-attempts">Tentativas de Login</Label>
                    <Input id="login-attempts" type="number" defaultValue="5" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configurações de Email
              </CardTitle>
              <CardDescription>Configure os serviços de email da plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">Servidor SMTP</Label>
                  <Input id="smtp-host" defaultValue="smtp.gmail.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Porta SMTP</Label>
                  <Input id="smtp-port" type="number" defaultValue="587" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtp-user">Usuário SMTP</Label>
                  <Input id="smtp-user" defaultValue="noreply@cobrancaauto.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-password">Senha SMTP</Label>
                  <Input id="smtp-password" type="password" placeholder="••••••••" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="from-email">Email Remetente</Label>
                <Input id="from-email" defaultValue="noreply@cobrancaauto.com" />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Templates de Email</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email de Boas-vindas</Label>
                      <p className="text-sm text-muted-foreground">Enviar email automático para novos usuários</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificações de Cobrança</Label>
                      <p className="text-sm text-muted-foreground">Enviar notificações automáticas de cobrança</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Relatórios Semanais</Label>
                      <p className="text-sm text-muted-foreground">Enviar relatórios semanais para administradores</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline">Testar Configuração</Button>
                <Button variant="outline">Enviar Email de Teste</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Configurações de Cobrança
              </CardTitle>
              <CardDescription>Configure as regras e métodos de cobrança</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default-currency">Moeda Padrão</Label>
                  <Select defaultValue="brl">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brl">Real Brasileiro (BRL)</SelectItem>
                      <SelectItem value="usd">Dólar Americano (USD)</SelectItem>
                      <SelectItem value="eur">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">Taxa de Imposto (%)</Label>
                  <Input id="tax-rate" type="number" step="0.01" defaultValue="0.00" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="late-fee">Taxa de Atraso (%)</Label>
                  <Input id="late-fee" type="number" step="0.01" defaultValue="2.00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interest-rate">Juros Mensais (%)</Label>
                  <Input id="interest-rate" type="number" step="0.01" defaultValue="1.00" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Métodos de Pagamento</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>PIX</Label>
                      <p className="text-sm text-muted-foreground">Aceitar pagamentos via PIX</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cartão de Crédito</Label>
                      <p className="text-sm text-muted-foreground">Aceitar pagamentos com cartão de crédito</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Boleto Bancário</Label>
                      <p className="text-sm text-muted-foreground">Aceitar pagamentos via boleto bancário</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Regras de Cobrança</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reminder-days">Lembrete (dias antes)</Label>
                    <Input id="reminder-days" type="number" defaultValue="3" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="overdue-days">Vencimento (dias após)</Label>
                    <Input id="overdue-days" type="number" defaultValue="30" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Integrações
              </CardTitle>
              <CardDescription>Configure integrações com serviços externos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Database className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Supabase</h4>
                      <p className="text-sm text-muted-foreground">Banco de dados e autenticação</p>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Conectado
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">SendGrid</h4>
                      <p className="text-sm text-muted-foreground">Serviço de email transacional</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Configurar
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Stripe</h4>
                      <p className="text-sm text-muted-foreground">Processamento de pagamentos</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Configurar
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Bell className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Slack</h4>
                      <p className="text-sm text-muted-foreground">Notificações em tempo real</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Configurar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Configurações Avançadas
              </CardTitle>
              <CardDescription>Configurações técnicas e de desenvolvimento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">API</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="api-version">Versão da API</Label>
                    <Select defaultValue="v1">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="v1">v1.0</SelectItem>
                        <SelectItem value="v2">v2.0 (Beta)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-timeout">Timeout (segundos)</Label>
                    <Input id="api-timeout" type="number" defaultValue="30" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Cache</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cache-ttl">TTL Padrão (minutos)</Label>
                    <Input id="cache-ttl" type="number" defaultValue="60" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cache-size">Tamanho Máximo (MB)</Label>
                    <Input id="cache-size" type="number" defaultValue="512" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cache Redis</Label>
                    <p className="text-sm text-muted-foreground">Usar Redis para cache distribuído</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Logs</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="log-level">Nível de Log</Label>
                    <Select defaultValue="info">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="log-retention">Retenção (dias)</Label>
                    <Input id="log-retention" type="number" defaultValue="30" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">Zona de Perigo</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Estas ações são irreversíveis e podem afetar todo o sistema.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button variant="destructive" size="sm">
                        Limpar Todos os Logs
                      </Button>
                      <Button variant="destructive" size="sm">
                        Reset Configurações
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
