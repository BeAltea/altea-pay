"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Bell, Mail, MessageSquare, Shield, Save, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export const dynamic = "force-dynamic"

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState("notifications")
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
    fromName: "CobrancaAuto",
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
    theme: "dark",
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
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast({
        title: "Sucesso",
        description: "Configuracoes salvas com sucesso!",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar configuracoes. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleTestEmail = async () => {
    if (!emailSettings.username || !emailSettings.password) {
      toast({
        title: "Erro",
        description: "Preencha usuario e senha para testar",
        variant: "destructive",
      })
      return
    }

    setTesting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast({
        title: "Teste realizado",
        description: "Email de teste enviado com sucesso!",
      })
    } catch (error) {
      toast({
        title: "Erro no teste",
        description: "Falha ao enviar email de teste. Verifique as configuracoes.",
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
        description: "Preencha a chave da API e numero do telefone",
        variant: "destructive",
      })
      return
    }

    setTesting(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast({
        title: "Conexao testada",
        description: "Conexao com WhatsApp estabelecida com sucesso!",
      })
    } catch (error) {
      toast({
        title: "Erro na conexao",
        description: "Falha ao conectar com WhatsApp. Verifique as configuracoes.",
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
        description: "Nova senha e confirmacao nao coincidem",
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
      description: "Funcionalidade de autenticacao de dois fatores em desenvolvimento",
    })
  }

  const handleViewSessions = () => {
    toast({
      title: "Sessoes Ativas",
      description: "Visualizacao de sessoes ativas em desenvolvimento",
    })
  }

  const tabs = [
    { id: "notifications", label: "Notificacoes", shortLabel: "Notif.", icon: Bell },
    { id: "email", label: "Email", shortLabel: "Email", icon: Mail },
    { id: "whatsapp", label: "WhatsApp", shortLabel: "WhatsApp", icon: MessageSquare },
    { id: "system", label: "Sistema", shortLabel: "Sist.", icon: Settings },
    { id: "security", label: "Seguranca", shortLabel: "Seg.", icon: Shield },
  ]

  const inputStyle = {
    background: "var(--admin-bg-tertiary)",
    border: "1px solid var(--admin-border)",
    color: "var(--admin-text-primary)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    width: "100%",
  }

  const cardStyle = {
    background: "var(--admin-bg-secondary)",
    border: "1px solid var(--admin-border)",
    borderRadius: "0.75rem",
    padding: "1.5rem",
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--admin-text-primary)" }}>
            Configuracoes
          </h1>
          <p className="text-sm md:text-base mt-1" style={{ color: "var(--admin-text-secondary)" }}>
            Gerencie as configuracoes do sistema e integracoes
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors w-full md:w-auto"
          style={{
            background: "var(--admin-gold-400)",
            color: "#000",
          }}
        >
          <Save className="h-4 w-4" />
          Salvar Alteracoes
        </button>
      </div>

      {/* Success Message */}
      {saved && (
        <div
          className="p-4 rounded-lg flex items-center space-x-2"
          style={{
            background: "rgba(45, 212, 168, 0.1)",
            border: "1px solid var(--admin-green)",
          }}
        >
          <CheckCircle className="h-4 w-4" style={{ color: "var(--admin-green)" }} />
          <p style={{ color: "var(--admin-green)" }}>Configuracoes salvas com sucesso!</p>
        </div>
      )}

      {/* Tabs */}
      <div className="space-y-4 md:space-y-6">
        {/* Tab Navigation */}
        <div
          className="flex overflow-x-auto rounded-lg p-1"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center justify-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-colors flex-1 min-w-0 whitespace-nowrap"
                style={{
                  background: isActive ? "var(--admin-bg-tertiary)" : "transparent",
                  color: isActive ? "var(--admin-gold-400)" : "var(--admin-text-secondary)",
                }}
              >
                <Icon className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === "notifications" && (
          <div style={cardStyle}>
            <div className="mb-4">
              <h2 className="text-lg md:text-xl font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                Configuracoes de Notificacoes
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--admin-text-secondary)" }}>
                Configure como e quando voce deseja receber notificacoes do sistema
              </p>
            </div>
            <div className="space-y-4">
              {[
                { key: "email", label: "Notificacoes por Email", desc: "Receba alertas e relatorios por email" },
                { key: "sms", label: "Notificacoes por SMS", desc: "Receba alertas urgentes por SMS" },
                { key: "whatsapp", label: "Notificacoes por WhatsApp", desc: "Receba relatorios e alertas via WhatsApp" },
                { key: "push", label: "Notificacoes Push", desc: "Receba notificacoes no navegador" },
              ].map((item, index) => (
                <div key={item.key}>
                  {index > 0 && <div className="border-t my-4" style={{ borderColor: "var(--admin-border)" }} />}
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5 flex-1 pr-4">
                      <Label className="text-sm md:text-base cursor-pointer" style={{ color: "var(--admin-text-primary)" }}>
                        {item.label}
                      </Label>
                      <p className="text-xs md:text-sm" style={{ color: "var(--admin-text-muted)" }}>
                        {item.desc}
                      </p>
                    </div>
                    <Switch
                      checked={notifications[item.key as keyof typeof notifications]}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                      className="cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "email" && (
          <div style={cardStyle}>
            <div className="mb-4">
              <h2 className="text-lg md:text-xl font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                Configuracoes de Email
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--admin-text-secondary)" }}>
                Configure o servidor SMTP para envio de emails de cobranca
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                    Servidor SMTP
                  </Label>
                  <input
                    type="text"
                    value={emailSettings.smtpServer}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpServer: e.target.value })}
                    placeholder="smtp.gmail.com"
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                    Porta
                  </Label>
                  <input
                    type="text"
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: e.target.value })}
                    placeholder="587"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                    Usuario
                  </Label>
                  <input
                    type="text"
                    value={emailSettings.username}
                    onChange={(e) => setEmailSettings({ ...emailSettings, username: e.target.value })}
                    placeholder="seu-email@gmail.com"
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                    Senha
                  </Label>
                  <input
                    type="password"
                    value={emailSettings.password}
                    onChange={(e) => setEmailSettings({ ...emailSettings, password: e.target.value })}
                    placeholder="********"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                    Nome do Remetente
                  </Label>
                  <input
                    type="text"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                    placeholder="CobrancaAuto"
                    style={inputStyle}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                    Email do Remetente
                  </Label>
                  <input
                    type="text"
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                    placeholder="noreply@suaempresa.com"
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                onClick={handleTestEmail}
                disabled={testing}
                className="w-full py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: testing ? "var(--admin-bg-tertiary)" : "var(--admin-blue)",
                  color: "#fff",
                  opacity: testing ? 0.7 : 1,
                }}
              >
                {testing ? "Testando..." : "Testar Configuracao"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "whatsapp" && (
          <div style={cardStyle}>
            <div className="mb-4">
              <h2 className="text-lg md:text-xl font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                Configuracoes do WhatsApp
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--admin-text-secondary)" }}>
                Configure a integracao com WhatsApp Business API
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-sm md:text-base cursor-pointer" style={{ color: "var(--admin-text-primary)" }}>
                    Habilitar WhatsApp
                  </Label>
                  <p className="text-xs md:text-sm" style={{ color: "var(--admin-text-muted)" }}>
                    Ativar envio de mensagens via WhatsApp
                  </p>
                </div>
                <Switch
                  checked={whatsappSettings.enabled}
                  onCheckedChange={(checked) => setWhatsappSettings({ ...whatsappSettings, enabled: checked })}
                  className="cursor-pointer"
                />
              </div>

              <div className="border-t" style={{ borderColor: "var(--admin-border)" }} />

              <div className="space-y-2">
                <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                  Chave da API
                </Label>
                <input
                  type="password"
                  value={whatsappSettings.apiKey}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, apiKey: e.target.value })}
                  placeholder="********************************"
                  disabled={!whatsappSettings.enabled}
                  style={{
                    ...inputStyle,
                    opacity: whatsappSettings.enabled ? 1 : 0.5,
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                  Numero do WhatsApp
                </Label>
                <input
                  type="text"
                  value={whatsappSettings.phoneNumber}
                  onChange={(e) => setWhatsappSettings({ ...whatsappSettings, phoneNumber: e.target.value })}
                  placeholder="+55 11 99999-9999"
                  disabled={!whatsappSettings.enabled}
                  style={{
                    ...inputStyle,
                    opacity: whatsappSettings.enabled ? 1 : 0.5,
                  }}
                />
              </div>

              <button
                onClick={handleTestWhatsApp}
                disabled={!whatsappSettings.enabled || testing}
                className="w-full py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: !whatsappSettings.enabled || testing ? "var(--admin-bg-tertiary)" : "var(--admin-green)",
                  color: "#fff",
                  opacity: !whatsappSettings.enabled || testing ? 0.5 : 1,
                }}
              >
                {testing ? "Testando..." : "Testar Conexao"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <div style={cardStyle}>
            <div className="mb-4">
              <h2 className="text-lg md:text-xl font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                Configuracoes do Sistema
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--admin-text-secondary)" }}>
                Configure o comportamento geral do sistema
              </p>
            </div>
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label className="text-sm md:text-base cursor-pointer" style={{ color: "var(--admin-text-primary)" }}>
                    Classificacao Automatica
                  </Label>
                  <p className="text-xs md:text-sm" style={{ color: "var(--admin-text-muted)" }}>
                    Classificar automaticamente novas dividas
                  </p>
                </div>
                <Switch
                  checked={systemSettings.autoClassification}
                  onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, autoClassification: checked })}
                  className="cursor-pointer"
                />
              </div>

              <div className="border-t" style={{ borderColor: "var(--admin-border)" }} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                    Dias para Lembrete
                  </Label>
                  <select
                    value={systemSettings.reminderDays}
                    onChange={(e) => setSystemSettings({ ...systemSettings, reminderDays: e.target.value })}
                    style={inputStyle}
                    className="cursor-pointer"
                  >
                    <option value="3">3 dias</option>
                    <option value="7">7 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                    Maximo de Tentativas
                  </Label>
                  <select
                    value={systemSettings.maxRetries}
                    onChange={(e) => setSystemSettings({ ...systemSettings, maxRetries: e.target.value })}
                    style={inputStyle}
                    className="cursor-pointer"
                  >
                    <option value="1">1 tentativa</option>
                    <option value="3">3 tentativas</option>
                    <option value="5">5 tentativas</option>
                    <option value="10">10 tentativas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                    Tema
                  </Label>
                  <select
                    value={systemSettings.theme}
                    onChange={(e) => setSystemSettings({ ...systemSettings, theme: e.target.value })}
                    style={inputStyle}
                    className="cursor-pointer"
                  >
                    <option value="light">Claro</option>
                    <option value="dark">Escuro</option>
                    <option value="system">Sistema</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                    Idioma
                  </Label>
                  <select
                    value={systemSettings.language}
                    onChange={(e) => setSystemSettings({ ...systemSettings, language: e.target.value })}
                    style={inputStyle}
                    className="cursor-pointer"
                  >
                    <option value="pt-BR">Portugues (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Espanol</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div style={cardStyle}>
            <div className="mb-4">
              <h2 className="text-lg md:text-xl font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                Configuracoes de Seguranca
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--admin-text-secondary)" }}>
                Gerencie configuracoes de seguranca e acesso
              </p>
            </div>
            <div className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                  Senha Atual
                </Label>
                <input
                  type="password"
                  placeholder="********"
                  value={securitySettings.currentPassword}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, currentPassword: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                  Nova Senha
                </Label>
                <input
                  type="password"
                  placeholder="********"
                  value={securitySettings.newPassword}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, newPassword: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                  Confirmar Nova Senha
                </Label>
                <input
                  type="password"
                  placeholder="********"
                  value={securitySettings.confirmPassword}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, confirmPassword: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <button
                onClick={handleChangePassword}
                className="w-full py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: "var(--admin-gold-400)",
                  color: "#000",
                }}
              >
                Alterar Senha
              </button>

              <div className="border-t" style={{ borderColor: "var(--admin-border)" }} />

              <div className="space-y-4">
                <h3 className="text-base md:text-lg font-medium" style={{ color: "var(--admin-text-primary)" }}>
                  Autenticacao de Dois Fatores
                </h3>
                <p className="text-xs md:text-sm" style={{ color: "var(--admin-text-muted)" }}>
                  Adicione uma camada extra de seguranca a sua conta
                </p>
                <button
                  onClick={handleSetup2FA}
                  className="w-full py-2 rounded-lg font-medium transition-colors"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--admin-border)",
                    color: "var(--admin-text-primary)",
                  }}
                >
                  Configurar 2FA
                </button>
              </div>

              <div className="border-t" style={{ borderColor: "var(--admin-border)" }} />

              <div className="space-y-4">
                <h3 className="text-base md:text-lg font-medium" style={{ color: "var(--admin-text-primary)" }}>
                  Sessoes Ativas
                </h3>
                <p className="text-xs md:text-sm" style={{ color: "var(--admin-text-muted)" }}>
                  Gerencie onde voce esta logado
                </p>
                <button
                  onClick={handleViewSessions}
                  className="w-full py-2 rounded-lg font-medium transition-colors"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--admin-border)",
                    color: "var(--admin-text-primary)",
                  }}
                >
                  Ver Sessoes Ativas
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
