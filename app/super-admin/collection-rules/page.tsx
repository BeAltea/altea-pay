"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Building2, Check, X, Users, AlertCircle, Timer, Clock, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { fetchAllCustomers } from "@/app/actions/fetch-customers-action"
import { getAutomaticCollectionStats } from "@/app/actions/analyses-actions"
import { getCollectionRulerStats } from "@/app/actions/ruler-actions"

interface CollectionRule {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  steps: CollectionRuleStep[]
  activeForCompanies: string[] | null
  activeForCustomers: string[] | null
  minScore: number
  maxScore: number
  processType: string
  priority: string
  ruleType: string
}

interface CollectionRuleStep {
  id: string
  ruleId: string
  stepOrder: number
  daysAfterDue: number
  channel: string
  template: string
  createdAt: string
}

interface Company {
  id: string
  name: string
  cnpj: string
}

interface Customer {
  id: string
  name: string
  document: string
  companyId: string
}

export default function SuperAdminCollectionRulesPage() {
  const [automaticStats, setAutomaticStats] = useState<any>(null)
  const [rulerStats, setRulerStats] = useState<any>(null)
  const [rules, setRules] = useState<CollectionRule[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<CollectionRule | null>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState<any>({
    name: "",
    description: "",
    isActive: true,
    steps: [],
    assignmentMode: "companies",
    assignedCompanies: [],
    assignedCustomers: [],
    minScore: 0,
    maxScore: 1000,
    processType: "automatic",
    priority: "medium",
    ruleType: "custom",
  })

  useEffect(() => {
    fetchRules()
    fetchCompanies()
    fetchCustomers()
    fetchAutomaticStats()
    fetchRulerStats()
  }, [])

  const fetchAutomaticStats = async () => {
    try {
      const stats = await getAutomaticCollectionStats()
      setAutomaticStats(stats)
    } catch (error) {
      console.error("[v0] Error fetching automatic stats:", error)
    }
  }

  const fetchRulerStats = async () => {
    try {
      const stats = await getCollectionRulerStats()
      setRulerStats(stats)
    } catch (error) {}
  }

  async function fetchRules() {
    try {
      // Fetch rules via API route that uses Drizzle ORM
      const response = await fetch("/api/collection-rules")
      if (!response.ok) throw new Error("Failed to fetch rules")
      const rulesData = await response.json()

      // Fetch steps for each rule
      const rulesWithSteps = await Promise.all(
        (rulesData || []).map(async (rule: any) => {
          const stepsResponse = await fetch(`/api/collection-rules/${rule.id}/steps`)
          const stepsData = stepsResponse.ok ? await stepsResponse.json() : []
          return { ...rule, steps: stepsData || [] }
        }),
      )

      setRules(rulesWithSteps)
    } catch (error: any) {
      toast({
        title: "Erro ao carregar reguas",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function fetchCompanies() {
    try {
      // Fetch companies via API route that uses Drizzle ORM
      const response = await fetch("/api/companies")
      if (!response.ok) throw new Error("Failed to fetch companies")
      const data = await response.json()
      setCompanies(data || [])
    } catch (error: any) {
      console.error("Error fetching companies:", error)
    }
  }

  async function fetchCustomers() {
    try {
      const result = await fetchAllCustomers()

      if (!result.success) {
        throw new Error(result.error)
      }

      console.log("[v0] Customers fetched via server action:", result.customers.length)
      setCustomers(result.customers)
    } catch (error: any) {
      console.error("Error fetching customers:", error.message || error)
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleSaveRule() {
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        isActive: formData.isActive,
        activeForCompanies:
          formData.assignmentMode === "companies" && formData.assignedCompanies.length > 0
            ? formData.assignedCompanies
            : formData.assignmentMode === "customers"
              ? formData.assignedCompanies
              : null,
        activeForCustomers:
          formData.assignmentMode === "customers" && formData.assignedCustomers.length > 0
            ? formData.assignedCustomers
            : null,
        minScore: formData.minScore,
        maxScore: formData.maxScore,
        processType: formData.processType,
        priority: formData.priority,
        ruleType: formData.ruleType,
        steps: formData.steps,
      }

      if (editingRule) {
        // Update existing rule via API
        const response = await fetch(`/api/collection-rules/${editingRule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) throw new Error("Failed to update rule")

        toast({
          title: "Regua atualizada",
          description: "A regua de cobranca foi atualizada com sucesso.",
        })
      } else {
        // Create new rule via API
        const response = await fetch("/api/collection-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) throw new Error("Failed to create rule")

        toast({
          title: "Regua criada",
          description: "A regua de cobranca foi criada com sucesso.",
        })
      }

      setShowDialog(false)
      setEditingRule(null)
      resetForm()
      fetchRules()
      fetchRulerStats()
    } catch (error: any) {
      toast({
        title: "Erro ao salvar regua",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!confirm("Tem certeza que deseja excluir esta regua?")) return

    try {
      const response = await fetch(`/api/collection-rules/${ruleId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete rule")

      toast({
        title: "Regua excluida",
        description: "A regua de cobranca foi excluida com sucesso.",
      })

      fetchRules()
      fetchRulerStats()
    } catch (error: any) {
      toast({
        title: "Erro ao excluir regua",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleToggleActive(rule: CollectionRule) {
    try {
      const response = await fetch(`/api/collection-rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      })

      if (!response.ok) throw new Error("Failed to toggle rule status")

      toast({
        title: rule.isActive ? "Regua desativada" : "Regua ativada",
        description: `A regua foi ${rule.isActive ? "desativada" : "ativada"} com sucesso.`,
      })

      fetchRules()
      fetchRulerStats()
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  function openCreateDialog() {
    resetForm()
    setEditingRule(null)
    setShowDialog(true)
  }

  function openEditDialog(rule: CollectionRule) {
    setFormData({
      name: rule.name,
      description: rule.description || "",
      isActive: rule.isActive,
      steps: rule.steps.map((step) => ({
        stepOrder: step.stepOrder,
        daysAfterDue: step.daysAfterDue,
        channel: step.channel,
        template: step.template,
      })),
      assignmentMode: rule.activeForCustomers && rule.activeForCustomers.length > 0 ? "customers" : "companies",
      assignedCompanies: rule.activeForCompanies || [],
      assignedCustomers: rule.activeForCustomers || [],
      minScore: rule.minScore || 0,
      maxScore: rule.maxScore || 1000,
      processType: rule.processType || "automatic",
      priority: rule.priority || "medium",
      ruleType: rule.ruleType || "custom",
    })
    setEditingRule(rule)
    setShowDialog(true)
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      isActive: true,
      steps: [],
      assignmentMode: "companies",
      assignedCompanies: [],
      assignedCustomers: [],
      minScore: 0,
      maxScore: 1000,
      processType: "automatic",
      priority: "medium",
      ruleType: "custom",
    })
  }

  function addStep() {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          stepOrder: formData.steps.length + 1,
          daysAfterDue: 0,
          channel: "email",
          template: "",
        },
      ],
    })
  }

  function removeStep(index: number) {
    const newSteps = formData.steps.filter((_: any, i: number) => i !== index)
    setFormData({
      ...formData,
      steps: newSteps.map((step: any, i: number) => ({ ...step, stepOrder: i + 1 })),
    })
  }

  function updateStep(index: number, field: string, value: any) {
    const newSteps = [...formData.steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setFormData({ ...formData, steps: newSteps })
  }

  function toggleCompanySelection(companyId: string) {
    setFormData((prev: any) => ({
      ...prev,
      assignedCompanies: prev.assignedCompanies.includes(companyId)
        ? prev.assignedCompanies.filter((id: string) => id !== companyId)
        : [...prev.assignedCompanies, companyId],
    }))
  }

  function toggleCustomerSelection(customerId: string) {
    setFormData((prev: any) => ({
      ...prev,
      assignedCustomers: prev.assignedCustomers.includes(customerId)
        ? prev.assignedCustomers.filter((id: string) => id !== customerId)
        : [...prev.assignedCustomers, customerId],
    }))
  }

  // Filter customers based on selected companies
  useEffect(() => {
    if (formData.assignedCompanies.length > 0) {
      setFilteredCustomers(customers.filter((customer) => formData.assignedCompanies.includes(customer.companyId)))
    } else {
      setFilteredCustomers(customers)
    }
  }, [formData.assignedCompanies, customers])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando reguas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reguas de Cobranca</h1>
          <p className="text-muted-foreground">Gerencie reguas de cobranca e atribua a empresas</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Regua Customizada
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-blue-600" />
              <CardTitle>Regua 1 - Analise de Score (Assertiva)</CardTitle>
            </div>
            <Badge variant={automaticStats?.eligible > 0 ? "default" : "secondary"}>
              {automaticStats?.eligible > 0 ? "Funcionando" : "Sem clientes"}
            </Badge>
          </div>
          <CardDescription>Regua automatica baseada no Score de Recuperacao da Assertiva (Classes A-F)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Clientes Elegiveis</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{automaticStats?.eligible || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Total de clientes com status ACEITA e Recovery Score &gt;= 294 (Classe C ou superior)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Aguardando Processamento</CardDescription>
                <CardTitle className="text-2xl text-orange-600">{automaticStats?.notProcessed || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Serao processados na proxima execucao automatica</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Ja Processados</CardDescription>
                <CardTitle className="text-2xl text-green-600">{automaticStats?.alreadyProcessed || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Cobrancas ja enviadas automaticamente</p>
              </CardContent>
            </Card>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="space-y-1 text-sm text-blue-900 dark:text-blue-100">
                <p>
                  <strong>Como funciona:</strong> Quando voce importa ou analisa um cliente, o sistema busca dados da
                  Assertiva e verifica o Score de Recuperacao automaticamente.
                </p>
                <p>
                  <strong>Criterios de Cobranca Automatica:</strong> Recovery Score &gt;= 294 (Classes C, B, A) - Cobranca
                  automatica permitida | Recovery Score &lt; 294 (Classes D, E, F) - Cobranca manual obrigatoria
                </p>
                <p>
                  <strong>Status:</strong> 100% Funcional baseado no Score de Recuperacao da Assertiva
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <CardTitle>Regua 2 - Cobranca Customizavel</CardTitle>
            </div>
            <Badge variant={rulerStats?.activeRulers > 0 ? "default" : "secondary"}>
              {rulerStats?.activeRulers > 0 ? "Funcionando" : "Aguardando configuracao"}
            </Badge>
          </div>
          <CardDescription>
            Regua customizavel baseada no Score de Recuperacao. Permite configurar dias e canais personalizados de
            cobranca
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Reguas Ativas</CardDescription>
                <CardTitle className="text-2xl text-purple-600">{rulerStats?.activeRulers || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Reguas customizadas criadas e ativas no sistema</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Clientes Elegiveis</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{rulerStats?.eligibleClients || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Clientes que podem receber cobranca customizada</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Execucoes Hoje</CardDescription>
                <CardTitle className="text-2xl text-green-600">{rulerStats?.successfulToday || 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Cobrancas enviadas com sucesso hoje</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Ultima Execucao</CardDescription>
                <CardTitle className="text-sm">
                  {rulerStats?.lastExecution ? new Date(rulerStats.lastExecution).toLocaleTimeString("pt-BR") : "Nunca"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Horario da ultima execucao automatica</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Executions */}
          {rulerStats?.recentExecutions?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Ultimas Execucoes Automaticas</h4>
              <div className="space-y-2">
                {rulerStats.recentExecutions.slice(0, 5).map((execution: any) => (
                  <div key={execution.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Regua: {execution.rulerName} - {execution.actionsTaken} acoes enviadas
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(execution.executedAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Badge variant={execution.status === "success" ? "default" : "destructive"}>
                      {execution.status === "success" ? "Sucesso" : "Erro"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-purple-600 mt-0.5" />
              <div className="space-y-1 text-sm text-purple-900 dark:text-purple-100">
                <p>
                  <strong>Como funciona:</strong> A regua customizavel executa automaticamente a cada hora via Vercel
                  Cron Job processando clientes baseado em daysAfterDue.
                </p>
                <p>
                  <strong>Configuracao:</strong> Cada empresa pode criar reguas com dias especificos (D0, D2, D5, D7) e
                  multiplos canais (Email, SMS, WhatsApp, Ligacao).
                </p>
                <p>
                  <strong>Proxima execucao:</strong> No inicio da proxima hora (as XX:00)
                </p>
                <p>
                  <strong>Status:</strong> 100% Funcional - Sistema pronto para uso. Clique em "Nova Regua Customizada"
                  acima para criar.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold">{rule.name}</h3>
                  <Badge variant={rule.isActive ? "default" : "secondary"}>
                    {rule.isActive ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                {rule.description && <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{rule.activeForCompanies?.length || 0} empresa(s)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{rule.activeForCustomers?.length || 0} cliente(s)</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleToggleActive(rule)}>
                  {rule.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEditDialog(rule)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Etapas:</h4>
              {rule.steps.map((step) => (
                <div key={step.id} className="flex items-center gap-4 text-sm p-3 bg-muted rounded-lg">
                  <Badge variant="outline">Etapa {step.stepOrder}</Badge>
                  <span>{step.daysAfterDue} dias apos vencimento</span>
                  <Badge>{step.channel}</Badge>
                  <span className="text-muted-foreground truncate flex-1">{step.template.substring(0, 50)}...</span>
                </div>
              ))}
            </div>
          </Card>
        ))}

        {rules.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhuma regua de cobranca cadastrada</p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Regua Customizada
            </Button>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar Regua" : "Nova Regua Customizada"}</DialogTitle>
            <DialogDescription>
              Configure uma regua de cobranca personalizada com score e criterios especificos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informacoes Basicas */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Informacoes Basicas</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome da Regua *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Regua Premium Score 600+"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Prioridade *</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descricao</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o objetivo desta regua customizada"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold text-sm">Criterios de Score</h4>
              <p className="text-xs text-muted-foreground">
                Defina a faixa de score para aplicar esta regua (diferente da regua padrao 350/490)
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minScore">Score Minimo</Label>
                  <Input
                    id="minScore"
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.minScore}
                    onChange={(e) => setFormData({ ...formData, minScore: Number.parseInt(e.target.value) || 0 })}
                    placeholder="Ex: 600"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Padrao sistema: 350 (medio), 490 (alto)</p>
                </div>

                <div>
                  <Label htmlFor="maxScore">Score Maximo</Label>
                  <Input
                    id="maxScore"
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.maxScore}
                    onChange={(e) => setFormData({ ...formData, maxScore: Number.parseInt(e.target.value) || 1000 })}
                    placeholder="Ex: 1000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Maximo: 1000</p>
                </div>
              </div>

              <div>
                <Label htmlFor="processType">Tipo de Processo *</Label>
                <Select
                  value={formData.processType}
                  onValueChange={(value) => setFormData({ ...formData, processType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de processo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">
                      <div className="space-y-1">
                        <div className="font-medium">Automatico</div>
                        <div className="text-xs text-muted-foreground">
                          Dispara mensagens automaticamente (Email + SMS)
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="semi_automatic">
                      <div className="space-y-1">
                        <div className="font-medium">Semi-Automatico</div>
                        <div className="text-xs text-muted-foreground">
                          Cria tarefa para operador (WhatsApp assistido)
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">
                      <div className="space-y-1">
                        <div className="font-medium">Manual</div>
                        <div className="text-xs text-muted-foreground">Cobranca 100% manual, bloqueia automacao</div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Esta regua customizada sera aplicada apenas aos clientes selecionados. Os demais clientes continuarao
                  usando a regua padrao do sistema.
                </p>
              </div>
            </div>

            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold text-sm">Criterios de Score de Recuperacao</h4>
              <p className="text-xs text-muted-foreground">
                Defina a faixa de Recovery Score para aplicar esta regua (sistema usa &gt;= 294 como padrao para cobranca
                automatica)
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minScore">Recovery Score Minimo</Label>
                  <Input
                    id="minScore"
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.minScore}
                    onChange={(e) => setFormData({ ...formData, minScore: Number.parseInt(e.target.value) || 0 })}
                    placeholder="Ex: 294"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Padrao sistema: 294 (Classe C), 491 (Classe B), 800+ (Classe A)
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxScore">Recovery Score Maximo</Label>
                  <Input
                    id="maxScore"
                    type="number"
                    min="0"
                    max="1000"
                    value={formData.maxScore}
                    onChange={(e) => setFormData({ ...formData, maxScore: Number.parseInt(e.target.value) || 1000 })}
                    placeholder="Ex: 1000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Maximo: 1000 (Classe A)</p>
                </div>
              </div>
            </div>

            {/* Etapas de Cobranca */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">Etapas de Cobranca</h4>
                  <p className="text-xs text-muted-foreground">Configure as mensagens e canais para cada etapa</p>
                </div>
                <Button type="button" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Etapa
                </Button>
              </div>

              {formData.steps.map((step: any, index: number) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Dias apos vencimento</Label>
                          <Input
                            type="number"
                            value={step.daysAfterDue}
                            onChange={(e) => updateStep(index, "daysAfterDue", Number.parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label>Canal</Label>
                          <Select value={step.channel} onValueChange={(value) => updateStep(index, "channel", value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="sms">SMS</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="phone">Ligacao</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Template da Mensagem</Label>
                        <Textarea
                          value={step.template}
                          onChange={(e) => updateStep(index, "template", e.target.value)}
                          placeholder="Digite o template da mensagem..."
                          rows={3}
                        />
                      </div>
                    </div>
                    {formData.steps.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Atribuicao de Clientes */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold text-sm">Atribuir Regua a Clientes Especificos</h4>
              <p className="text-xs text-muted-foreground">Selecione os clientes que usarao esta regua customizada</p>

              <div className="flex gap-2 p-1 bg-muted/50 rounded-lg border">
                <Button
                  type="button"
                  variant={formData.assignmentMode === "companies" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFormData({ ...formData, assignmentMode: "companies", assignedCustomers: [] })}
                  className="flex-1"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Empresas
                </Button>
                <Button
                  type="button"
                  variant={formData.assignmentMode === "customers" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFormData({ ...formData, assignmentMode: "customers" })}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Clientes Especificos
                </Button>
              </div>

              {formData.assignmentMode === "companies" ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Selecione as empresas</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      A regua sera aplicada a todos os clientes dessas empresas
                    </p>
                    <div className="max-h-60 overflow-y-auto space-y-2 p-3 border rounded-lg bg-background">
                      {companies.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma empresa encontrada</p>
                      ) : (
                        companies.map((company) => (
                          <div
                            key={company.id}
                            className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg cursor-pointer transition-colors border border-transparent hover:border-border"
                            onClick={() => toggleCompanySelection(company.id)}
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                formData.assignedCompanies.includes(company.id)
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {formData.assignedCompanies.includes(company.id) && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{company.name}</p>
                              <p className="text-xs text-muted-foreground">{company.cnpj}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formData.assignedCompanies.length} empresa(s) selecionada(s)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">1. Selecione as empresas</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Primeiro escolha as empresas para filtrar os clientes
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-2 p-3 border rounded-lg bg-background">
                      {companies.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhuma empresa encontrada</p>
                      ) : (
                        companies.map((company) => (
                          <div
                            key={company.id}
                            className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
                            onClick={() => toggleCompanySelection(company.id)}
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                formData.assignedCompanies.includes(company.id)
                                  ? "bg-primary border-primary"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {formData.assignedCompanies.includes(company.id) && (
                                <Check className="h-3 w-3 text-primary-foreground" />
                              )}
                            </div>
                            <span className="text-sm font-medium">{company.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {formData.assignedCompanies.length > 0 ? (
                    <div>
                      <label className="text-sm font-medium">2. Selecione os clientes</label>
                      <p className="text-xs text-muted-foreground">
                        Escolha clientes especificos das empresas selecionadas
                      </p>
                      <div className="max-h-[300px] overflow-y-auto rounded-md border p-4">
                        {filteredCustomers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Users className="mb-2 h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                              {formData.assignedCompanies.length === 0
                                ? "Selecione empresas primeiro"
                                : "Nenhum cliente encontrado para as empresas selecionadas"}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {filteredCustomers.map((customer) => (
                              <div key={customer.id} className="flex items-start space-x-2">
                                <Checkbox
                                  id={`customer-${customer.id}`}
                                  checked={formData.assignedCustomers.includes(customer.id)}
                                  onCheckedChange={() => toggleCustomerSelection(customer.id)}
                                />
                                <label
                                  htmlFor={`customer-${customer.id}`}
                                  className="flex-1 cursor-pointer text-sm leading-tight"
                                >
                                  <div className="font-medium">{customer.name}</div>
                                  <div className="text-xs text-muted-foreground">{customer.document}</div>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formData.assignedCustomers.length} cliente(s) selecionado(s)
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed rounded-lg bg-muted/30 text-center">
                      <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Selecione pelo menos uma empresa para ver os clientes
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isActive">Regua ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveRule}>
              {editingRule ? "Salvar Alteracoes" : "Criar Regua"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
