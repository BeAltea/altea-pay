"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ArrowLeft, Save, Shield, Bell, CreditCard, Users, AlertTriangle } from "lucide-react"

interface CompanySettings {
  notifications: {
    emailAlerts: boolean
    smsAlerts: boolean
    weeklyReports: boolean
    monthlyReports: boolean
  }
  security: {
    twoFactorRequired: boolean
    sessionTimeout: number
    ipWhitelist: string[]
  }
  billing: {
    plan: string
    autoRenewal: boolean
    billingEmail: string
  }
  permissions: {
    allowUserRegistration: boolean
    maxUsers: number
    defaultRole: string
  }
}

export default function CompanySettingsPage({ params }: { params: { id: string } }) {
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<CompanySettings>({
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      weeklyReports: true,
      monthlyReports: true,
    },
    security: {
      twoFactorRequired: false,
      sessionTimeout: 30,
      ipWhitelist: [],
    },
    billing: {
      plan: "premium",
      autoRenewal: true,
      billingEmail: "admin@enel.com.br",
    },
    permissions: {
      allowUserRegistration: false,
      maxUsers: 10,
      defaultRole: "operator",
    },
  })

  const companyName = "Enel Distribuição São Paulo"

  const handleSave = async () => {
    setIsLoading(true)
    console.log("[v0] Salvando configurações da empresa:", settings)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    alert("Configurações salvas com sucesso!")
    setIsLoading(false)
  }

  const updateNotificationSetting = (key: keyof CompanySettings["notifications"], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }))
  }

  const updateSecuritySetting = (key: keyof CompanySettings["security"], value: any) => {
    setSettings((prev) => ({
      ...prev,
      security: { ...prev.security, [key]: value },
    }))
  }

  const updateBillingSetting = (key: keyof CompanySettings["billing"], value: any) => {
    setSettings((prev) => ({
      ...prev,
      billing: { ...prev.billing, [key]: value },
    }))
  }

  const updatePermissionSetting = (key: keyof CompanySettings["permissions"], value: any) => {
    setSettings((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: value },
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={`/.jpg?height=64&width=64&query=${companyName}`} />
            <AvatarFallback className="bg-altea-gold/10 text-altea-navy text-lg">
              {companyName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
            <p className="text-gray-600 dark:text-gray-400">{companyName}</p>
          </div>
        </div>
        <div className="flex space-x-3 flex-shrink-0">
          <Button asChild variant="outline">
            <Link href={`/super-admin/companies/${params.id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>Salvando...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="billing">Cobrança</TabsTrigger>
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Configurações de Notificação</span>
              </CardTitle>
              <CardDescription>Configure como e quando a empresa receberá notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas por Email</Label>
                  <p className="text-sm text-gray-600">Receber alertas importantes por email</p>
                </div>
                <Switch
                  checked={settings.notifications.emailAlerts}
                  onCheckedChange={(checked) => updateNotificationSetting("emailAlerts", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas por SMS</Label>
                  <p className="text-sm text-gray-600">Receber alertas críticos por SMS</p>
                </div>
                <Switch
                  checked={settings.notifications.smsAlerts}
                  onCheckedChange={(checked) => updateNotificationSetting("smsAlerts", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatórios Semanais</Label>
                  <p className="text-sm text-gray-600">Receber resumo semanal de performance</p>
                </div>
                <Switch
                  checked={settings.notifications.weeklyReports}
                  onCheckedChange={(checked) => updateNotificationSetting("weeklyReports", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatórios Mensais</Label>
                  <p className="text-sm text-gray-600">Receber relatório mensal completo</p>
                </div>
                <Switch
                  checked={settings.notifications.monthlyReports}
                  onCheckedChange={(checked) => updateNotificationSetting("monthlyReports", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Configurações de Segurança</span>
              </CardTitle>
              <CardDescription>Configure as políticas de segurança para a empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autenticação de Dois Fatores Obrigatória</Label>
                  <p className="text-sm text-gray-600">Exigir 2FA para todos os usuários</p>
                </div>
                <Switch
                  checked={settings.security.twoFactorRequired}
                  onCheckedChange={(checked) => updateSecuritySetting("twoFactorRequired", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Timeout de Sessão (minutos)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) => updateSecuritySetting("sessionTimeout", Number.parseInt(e.target.value))}
                  min="5"
                  max="480"
                />
                <p className="text-sm text-gray-600">Tempo limite para sessões inativas</p>
              </div>

              <div className="space-y-2">
                <Label>Lista de IPs Permitidos</Label>
                <Input
                  placeholder="Ex: 192.168.1.1, 10.0.0.0/24"
                  value={settings.security.ipWhitelist.join(", ")}
                  onChange={(e) =>
                    updateSecuritySetting(
                      "ipWhitelist",
                      e.target.value.split(",").map((ip) => ip.trim()),
                    )
                  }
                />
                <p className="text-sm text-gray-600">Deixe vazio para permitir qualquer IP</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Configurações de Cobrança</span>
              </CardTitle>
              <CardDescription>Gerencie o plano e configurações de pagamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="plan">Plano Atual</Label>
                <Select value={settings.billing.plan} onValueChange={(value) => updateBillingSetting("plan", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico - R$ 299/mês</SelectItem>
                    <SelectItem value="premium">Premium - R$ 599/mês</SelectItem>
                    <SelectItem value="enterprise">Enterprise - R$ 1.299/mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Renovação Automática</Label>
                  <p className="text-sm text-gray-600">Renovar automaticamente o plano</p>
                </div>
                <Switch
                  checked={settings.billing.autoRenewal}
                  onCheckedChange={(checked) => updateBillingSetting("autoRenewal", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingEmail">Email para Cobrança</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  value={settings.billing.billingEmail}
                  onChange={(e) => updateBillingSetting("billingEmail", e.target.value)}
                />
                <p className="text-sm text-gray-600">Email para receber faturas e avisos de cobrança</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Configurações de Permissões</span>
              </CardTitle>
              <CardDescription>Configure as permissões e limites de usuários</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir Auto-Registro de Usuários</Label>
                  <p className="text-sm text-gray-600">Usuários podem se registrar sem convite</p>
                </div>
                <Switch
                  checked={settings.permissions.allowUserRegistration}
                  onCheckedChange={(checked) => updatePermissionSetting("allowUserRegistration", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUsers">Máximo de Usuários</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={settings.permissions.maxUsers}
                  onChange={(e) => updatePermissionSetting("maxUsers", Number.parseInt(e.target.value))}
                  min="1"
                  max="100"
                />
                <p className="text-sm text-gray-600">Limite máximo de usuários ativos</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultRole">Função Padrão para Novos Usuários</Label>
                <Select
                  value={settings.permissions.defaultRole}
                  onValueChange={(value) => updatePermissionSetting("defaultRole", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Zona de Perigo</span>
              </CardTitle>
              <CardDescription>Ações irreversíveis que afetam a empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg">
                <div>
                  <p className="font-medium text-red-600">Suspender Empresa</p>
                  <p className="text-sm text-gray-600">Suspende temporariamente o acesso da empresa</p>
                </div>
                <Button variant="destructive" size="sm">
                  Suspender
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg">
                <div>
                  <p className="font-medium text-red-600">Excluir Empresa</p>
                  <p className="text-sm text-gray-600">Remove permanentemente a empresa e todos os dados</p>
                </div>
                <Button variant="destructive" size="sm">
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
