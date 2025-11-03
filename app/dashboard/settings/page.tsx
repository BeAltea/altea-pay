"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ResponsiveTabs,
  ResponsiveTabsList,
  ResponsiveTabsTrigger,
  ResponsiveTabsContent,
} from "@/components/ui/responsive-tabs"
import { Settings, Bell, Mail, MessageSquare, Shield, Save, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export const dynamic = "force-dynamic"

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    whatsapp: true,
    push: true,
  })

  const [emailSettings, setEmailSettings] = useState({
    smtpServer: "smtp.gmail.com",
    smtpPort: "587",
    username: "",
    password: "",
    fromName: "CobrançaAuto",
    fromEmail: "",
  })

  const [whatsappSettings, setWhatsappSettings] = useState({
    apiKey: "",
    phoneNumber: "",
    enabled: false,
  })

  const [systemSettings, setSystemSettings] = useState({
    autoClassification: true,
    reminderDays: "7",
    maxRetries: "3",
    theme: "light",
    language: "pt-BR",
  })

  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleTestEmail = async () => {
    if (!emailSettings.username || !emailSettings.password) {
      toast({
        title: "Erro",
        description: "Preencha usuário e senha para testar",
        variant: "destructive",
      })
      return
    }

    setTesting(true)
    try {
      // Simulate email test
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Teste realizado",
        description: "Email de teste enviado com sucesso!",
      })
    } catch (error) {
      toast({
        title: "Erro no teste",
        description: "Falha ao enviar email de teste. Verifique as configurações.",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleTestWhatsApp = async () => {
    if (!whatsappSettings.apiKey || !whatsappSettings.phoneNumber) {
      toast({
        title: "Erro",
        description: "Preencha a chave da API e número do telefone",
        variant: "destructive",
      })
      return
    }

    setTesting(true)
    try {
      // Simulate WhatsApp test
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: "Conexão testada",
        description: "Conexão com WhatsApp estabelecida com sucesso!",
      })
    } catch (error) {
      toast({
        title: "Erro na conexão",
        description: "Falha ao conectar com WhatsApp. Verifique as configurações.",
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleChangePassword = async () => {
    if (!securitySettings.currentPassword || !securitySettings.newPassword || !securitySettings.confirmPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos de senha",
        variant: "destructive",
      })
      return
    }

    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      toast({
        title: "Erro",
        description: "Nova senha e confirmação não coincidem",
        variant: "destructive",
      })
      return
    }

    if (securitySettings.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "Nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      })
      return
    }

    try {
      // Simulate password change
      await new Promise((resolve) => setTimeout(resolve, 1500))

      setSecuritySettings({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso!",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar senha. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleSetup2FA = () => {
    toast({
      title: "2FA",
      description: "Funcionalidade de autenticação de dois fatores em desenvolvimento",
    })
  }

  const handleViewSessions = () => {
    toast({
      title: "Sessões Ativas",
      description: "Visualização de sessões ativas em desenvolvimento",
    })
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Configurações</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            Gerencie as configurações do sistema e integrações
          </p>
        </div>
        <Button onClick={handleSave} className="cursor-pointer w-full md:w-auto">
          <Save className="mr-2 h-4 w-4" />
          Salvar Alterações
        </Button>
      </div>

      {saved && (
        <div className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 p-4 rounded-md flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <p className="text-green-800 dark:text-green-400">Configurações salvas com sucesso!</p>
        </div>
      )}

      <ResponsiveTabs defaultValue="notifications" className="space-y-4 md:space-y-6">
        <ResponsiveTabsList className="grid w-full grid-cols-5 min-w-max">
          <ResponsiveTabsTrigger value="notifications" className="cursor-pointer text-xs md:text-sm p-2 md:p-3">
            <Bell className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Notificações</span>
            <span className="sm:hidden">Notif.</span>
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="email" className="cursor-pointer text-xs md:text-sm p-2 md:p-3">
            <Mail className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
            <span>Email</span>
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="whatsapp" className="cursor-pointer text-xs md:text-sm p-2 md:p-3">
            <MessageSquare className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
            <span className="sm:hidden">WhatsApp</span>
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="system" className="cursor-pointer text-xs md:text-sm p-2 md:p-3">
            <Settings className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Sistema</span>
            <span className="sm:hidden">Sist.</span>
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="security" className="cursor-pointer text-xs md:text-sm p-2 md:p-3">
            <Shield className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Segurança</span>
            <span className="sm:hidden">Seg.</span>
          </ResponsiveTabsTrigger>
        </ResponsiveTabsList>

        <ResponsiveTabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Configurações de Notificações</CardTitle>
              <CardDescription className="text-sm">
                Configure como e quando você deseja receber notificações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-sm md:text-base cursor-pointer">Notificações por Email</Label>
                  <p className="text-xs md:text-sm text-gray-500">Receba alertas e relatórios por email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                  className="cursor-pointer"
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800"></div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-sm md:text-base cursor-pointer">Notificações por SMS</Label>
                  <p className="text-xs md:text-sm text-gray-500">Receba alertas urgentes por SMS</p>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                  className="cursor-pointer"
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800"></div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-sm md:text-base cursor-pointer">Notificações por WhatsApp</Label>
                  <p className="text-xs md:text-sm text-gray-500">Receba relatórios e alertas via WhatsApp</p>
                </div>
                <Switch
                  checked={notifications.whatsapp}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, whatsapp: checked })}
                  className="cursor-pointer"
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800"></div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-sm md:text-base cursor-pointer">Notificações Push</Label>
                  <p className="text-xs md:text-sm text-gray-500">Receba notificações no navegador</p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                  className="cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </ResponsiveTabsContent>

        <ResponsiveTabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Configurações de Email</CardTitle>
              <CardDescription className="text-sm">
                Configure o servidor SMTP para envio de emails de cobrança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-server" className="text-sm">
                    Servidor SMTP
                  </Label>
                  <Input
                    id="smtp-server"
                    value={emailSettings.smtpServer}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpServer: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port" className="text-sm">
                    Porta
                  </Label>
                  <Input
                    id="smtp-port"
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-username" className="text-sm">
                    Usuário
                  </Label>
                  <Input
                    id="smtp-username"
                    value={emailSettings.username}
                    onChange={(e) => setEmailSettings({ ...emailSettings, username: e.target.value })}
                    placeholder="seu-email@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-password" className="text-sm">
                    Senha
                  </Label>
                  <Input
                    id="smtp-password"
                    type="password"
                    value={emailSettings.password}
                    onChange={(e) => setEmailSettings({ ...emailSettings, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-name" className="text-sm">
                    Nome do Remetente
                  </Label>
                  <Input
                    id="from-name"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                    placeholder="CobrançaAuto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-email" className="text-sm">
                    Email do Remetente
                  </Label>
                  <Input
                    id="from-email"
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                    placeholder="noreply@suaempresa.com"
                  />
                </div>
              </div>

              <Button onClick={handleTestEmail} disabled={testing} className="w-full cursor-pointer">
                {testing ? "Testando..." : "Testar Configuração"}
              </Button>
            </CardContent>
          </Card>
        </ResponsiveTabsContent>

        <ResponsiveTabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Configurações do WhatsApp</CardTitle>
              <CardDescription className="text-sm">Configure a integração com WhatsApp Business API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-sm md:text-base cursor-pointer">Habilitar WhatsApp</Label>
                  <p className="text-xs md:text-sm text-gray-500">Ativar envio de mensagens via WhatsApp</p>
                </div>
                <Switch
                  checked={whatsappSettings.enabled}
                  onCheckedChange={(checked) => setWhatsappSettings({ ...whatsappSettings, enabled: checked })}
                  className="cursor-pointer"
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800"></div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-api-key" className="text-sm">
                  Chave da API
                </Label>
                <Input
                  id="whatsapp-api-key"
                  type="password"
                  value={whatsappSettings.apiKey}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, apiKey: e.target.value })}
                  placeholder="••••••••••••••••••••••••••••••••"
                  disabled={!whatsappSettings.enabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp-phone" className="text-sm">
                  Número do WhatsApp
                </Label>
                <Input
                  id="whatsapp-phone"
                  value={whatsappSettings.phoneNumber}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, phoneNumber: e.target.value })}
                  placeholder="+55 11 99999-9999"
                  disabled={!whatsappSettings.enabled}
                />
              </div>

              <Button
                onClick={handleTestWhatsApp}
                disabled={!whatsappSettings.enabled || testing}
                className="w-full cursor-pointer"
              >
                {testing ? "Testando..." : "Testar Conexão"}
              </Button>
            </CardContent>
          </Card>
        </ResponsiveTabsContent>

        <ResponsiveTabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Configurações do Sistema</CardTitle>
              <CardDescription className="text-sm">Configure o comportamento geral do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-sm md:text-base cursor-pointer">Classificação Automática</Label>
                  <p className="text-xs md:text-sm text-gray-500">Classificar automaticamente novas dívidas</p>
                </div>
                <Switch
                  checked={systemSettings.autoClassification}
                  onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, autoClassification: checked })}
                  className="cursor-pointer"
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reminder-days" className="text-sm">
                    Dias para Lembrete
                  </Label>
                  <Select
                    value={systemSettings.reminderDays}
                    onValueChange={(value) => setSystemSettings({ ...systemSettings, reminderDays: value })}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3" className="cursor-pointer">
                        3 dias
                      </SelectItem>
                      <SelectItem value="7" className="cursor-pointer">
                        7 dias
                      </SelectItem>
                      <SelectItem value="15" className="cursor-pointer">
                        15 dias
                      </SelectItem>
                      <SelectItem value="30" className="cursor-pointer">
                        30 dias
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-retries" className="text-sm">
                    Máximo de Tentativas
                  </Label>
                  <Select
                    value={systemSettings.maxRetries}
                    onValueChange={(value) => setSystemSettings({ ...systemSettings, maxRetries: value })}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="cursor-pointer">
                        1 tentativa
                      </SelectItem>
                      <SelectItem value="3" className="cursor-pointer">
                        3 tentativas
                      </SelectItem>
                      <SelectItem value="5" className="cursor-pointer">
                        5 tentativas
                      </SelectItem>
                      <SelectItem value="10" className="cursor-pointer">
                        10 tentativas
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme" className="text-sm">
                    Tema
                  </Label>
                  <Select
                    value={systemSettings.theme}
                    onValueChange={(value) => setSystemSettings({ ...systemSettings, theme: value })}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light" className="cursor-pointer">
                        Claro
                      </SelectItem>
                      <SelectItem value="dark" className="cursor-pointer">
                        Escuro
                      </SelectItem>
                      <SelectItem value="system" className="cursor-pointer">
                        Sistema
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language" className="text-sm">
                    Idioma
                  </Label>
                  <Select
                    value={systemSettings.language}
                    onValueChange={(value) => setSystemSettings({ ...systemSettings, language: value })}
                  >
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR" className="cursor-pointer">
                        Português (Brasil)
                      </SelectItem>
                      <SelectItem value="en-US" className="cursor-pointer">
                        English (US)
                      </SelectItem>
                      <SelectItem value="es-ES" className="cursor-pointer">
                        Español
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </ResponsiveTabsContent>

        <ResponsiveTabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Configurações de Segurança</CardTitle>
              <CardDescription className="text-sm">Gerencie configurações de segurança e acesso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-sm">
                  Senha Atual
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  value={securitySettings.currentPassword}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, currentPassword: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm">
                  Nova Senha
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={securitySettings.newPassword}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, newPassword: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm">
                  Confirmar Nova Senha
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={securitySettings.confirmPassword}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, confirmPassword: e.target.value })}
                />
              </div>

              <Button onClick={handleChangePassword} className="w-full cursor-pointer">
                Alterar Senha
              </Button>

              <div className="border-t border-gray-200 dark:border-gray-800"></div>

              <div className="space-y-4">
                <h3 className="text-base md:text-lg font-medium">Autenticação de Dois Fatores</h3>
                <p className="text-xs md:text-sm text-gray-500">Adicione uma camada extra de segurança à sua conta</p>
                <Button onClick={handleSetup2FA} variant="outline" className="w-full bg-transparent cursor-pointer">
                  Configurar 2FA
                </Button>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800"></div>

              <div className="space-y-4">
                <h3 className="text-base md:text-lg font-medium">Sessões Ativas</h3>
                <p className="text-xs md:text-sm text-gray-500">Gerencie onde você está logado</p>
                <Button onClick={handleViewSessions} variant="outline" className="w-full bg-transparent cursor-pointer">
                  Ver Sessões Ativas
                </Button>
              </div>
            </CardContent>
          </Card>
        </ResponsiveTabsContent>
      </ResponsiveTabs>
    </div>
  )
}
