"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import {
  Plus,
  Trash2,
  Edit,
  Calendar,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Target,
  PlayCircle,
  PauseCircle,
} from "lucide-react"
import {
  createCollectionRule,
  updateCollectionRule,
  deleteCollectionRule,
  toggleCollectionRule,
  getCollectionRules,
} from "@/app/actions/collection-ruler-actions"

interface Step {
  step_order: number
  days_after_due: number
  action_type: string
  template_subject?: string
  template_content: string
  execution_time: string
  is_enabled: boolean
}

interface Rule {
  id: string
  name: string
  description: string
  is_active: boolean
  execution_mode: string
  start_date_field: string
  is_default_for_company: boolean
  requires_approval_status: string[]
  created_at: string
  last_execution_at?: string
  steps: Step[]
}

export default function CollectionRulersPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [companyId, setCompanyId] = useState<string>("")
  const { toast } = useToast()
  const { companyId: authCompanyId } = useAuth()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
    execution_mode: "automatic",
    start_date_field: "due_date",
    is_default_for_company: false,
    requires_approval_status: ["ACEITA", "ACEITA_ESPECIAL"],
    steps: [] as Step[],
  })

  useEffect(() => {
    if (authCompanyId) {
      setCompanyId(authCompanyId)
      fetchCompanyAndRules(authCompanyId)
    }
  }, [authCompanyId])

  async function fetchCompanyAndRules(cId?: string) {
    try {
      const id = cId || companyId
      if (!id) return

      const result = await getCollectionRules(id)
      if (result.success) {
        setRules(result.data)
      }
    } catch (error) {
      console.error("Error fetching rules:", error)
    } finally {
      setLoading(false)
    }
  }

  function addStep() {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          step_order: formData.steps.length + 1,
          days_after_due: 0,
          action_type: "email",
          template_subject: "",
          template_content: "",
          execution_time: "09:00:00",
          is_enabled: true,
        },
      ],
    })
  }

  function removeStep(index: number) {
    const newSteps = formData.steps.filter((_, i) => i !== index)
    setFormData({ ...formData, steps: newSteps })
  }

  function updateStep(index: number, field: string, value: any) {
    const newSteps = [...formData.steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setFormData({ ...formData, steps: newSteps })
  }

  async function handleSave() {
    try {
      if (!formData.name || formData.steps.length === 0) {
        toast({
          title: "Erro",
          description: "Preencha o nome e adicione pelo menos um step",
          variant: "destructive",
        })
        return
      }

      const data = { ...formData, company_id: companyId }

      if (editingRule) {
        const result = await updateCollectionRule(editingRule.id, data)
        if (result.success) {
          toast({
            title: "Régua atualizada",
            description: "A régua foi atualizada com sucesso",
          })
        } else {
          throw new Error(result.error)
        }
      } else {
        const result = await createCollectionRule(data as any)
        if (result.success) {
          toast({
            title: "Régua criada",
            description: "A régua foi criada com sucesso",
          })
        } else {
          throw new Error(result.error)
        }
      }

      setShowDialog(false)
      setEditingRule(null)
      resetForm()
      fetchCompanyAndRules()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      is_active: true,
      execution_mode: "automatic",
      start_date_field: "due_date",
      is_default_for_company: false,
      requires_approval_status: ["ACEITA", "ACEITA_ESPECIAL"],
      steps: [],
    })
  }

  function handleEdit(rule: Rule) {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description || "",
      is_active: rule.is_active,
      execution_mode: rule.execution_mode,
      start_date_field: rule.start_date_field,
      is_default_for_company: rule.is_default_for_company,
      requires_approval_status: rule.requires_approval_status,
      steps: rule.steps.map((s) => ({ ...s })),
    })
    setShowDialog(true)
  }

  async function handleDelete(ruleId: string) {
    if (!confirm("Tem certeza que deseja excluir esta régua?")) return

    const result = await deleteCollectionRule(ruleId)
    if (result.success) {
      toast({
        title: "Régua excluída",
        description: "A régua foi excluída com sucesso",
      })
      fetchCompanyAndRules()
    } else {
      toast({
        title: "Erro",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  async function handleToggle(ruleId: string, currentStatus: boolean) {
    const result = await toggleCollectionRule(ruleId, !currentStatus)
    if (result.success) {
      toast({
        title: currentStatus ? "Régua desativada" : "Régua ativada",
        description: "O status foi alterado com sucesso",
      })
      fetchCompanyAndRules()
    } else {
      toast({
        title: "Erro",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "sms":
        return <MessageSquare className="h-4 w-4" />
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />
      case "call_automatic":
        return <Phone className="h-4 w-4" />
      case "call_human":
        return <Phone className="h-4 w-4" />
      default:
        return <Target className="h-4 w-4" />
    }
  }

  if (loading) {
    return <div className="p-8">Carregando...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Réguas de Cobrança Customizáveis</h1>
          <p className="text-muted-foreground">Configure seu fluxo de cobrança automatizado</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setEditingRule(null)
            setShowDialog(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Régua
        </Button>
      </div>

      <div className="grid gap-6">
        {rules.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">Nenhuma régua cadastrada</p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Régua
              </Button>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {rule.name}
                      {rule.is_default_for_company && (
                        <span className="text-xs font-normal px-2 py-1 bg-blue-100 text-blue-700 rounded">Padrão</span>
                      )}
                    </CardTitle>
                    <CardDescription>{rule.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(rule.id, rule.is_active)}>
                      {rule.is_active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <span className={rule.is_active ? "text-green-600" : "text-gray-400"}>
                        {rule.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Modo:</span>{" "}
                      {rule.execution_mode === "automatic" ? "Automático" : "Manual"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Steps:</span> {rule.steps.length}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Etapas configuradas:</h4>
                    <div className="space-y-2">
                      {rule.steps
                        .sort((a, b) => a.step_order - b.step_order)
                        .map((step) => (
                          <div
                            key={step.step_order}
                            className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              {getActionIcon(step.action_type)}
                              <span className="font-medium">D{step.days_after_due}</span>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium capitalize">{step.action_type.replace("_", " ")}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">{step.template_content}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {step.execution_time}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {rule.last_execution_at && (
                    <div className="text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Última execução: {new Date(rule.last_execution_at).toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar Régua de Cobrança" : "Nova Régua de Cobrança"}</DialogTitle>
            <DialogDescription>Configure os dias e canais de comunicação automática</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Régua *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Régua Padrão - D0 a D30"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o objetivo desta régua"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Referência</Label>
                  <Select
                    value={formData.start_date_field}
                    onValueChange={(value) => setFormData({ ...formData, start_date_field: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due_date">Data de Vencimento</SelectItem>
                      <SelectItem value="first_overdue">Primeira Vencida</SelectItem>
                      <SelectItem value="analysis_date">Data da Análise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_default_for_company}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default_for_company: checked })}
                  />
                  <Label>Definir como régua padrão</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">Etapas de Cobrança</h4>
                  <p className="text-xs text-muted-foreground">
                    Configure quando e como entrar em contato (ex: D0, D3, D7)
                  </p>
                </div>
                <Button type="button" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              {formData.steps.map((step, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Dia (D+)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={step.days_after_due}
                          onChange={(e) => updateStep(index, "days_after_due", Number.parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Canal</Label>
                        <Select
                          value={step.action_type}
                          onValueChange={(value) => updateStep(index, "action_type", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="call_automatic">Ligação Automática</SelectItem>
                            <SelectItem value="call_human">Ligação Humana</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Horário</Label>
                        <Input
                          type="time"
                          value={step.execution_time}
                          onChange={(e) => updateStep(index, "execution_time", e.target.value)}
                        />
                      </div>
                    </div>

                    {step.action_type === "email" && (
                      <div>
                        <Label>Assunto</Label>
                        <Input
                          value={step.template_subject || ""}
                          onChange={(e) => updateStep(index, "template_subject", e.target.value)}
                          placeholder="Ex: Lembrete de Pagamento"
                        />
                      </div>
                    )}

                    <div>
                      <Label>Mensagem</Label>
                      <Textarea
                        value={step.template_content}
                        onChange={(e) => updateStep(index, "template_content", e.target.value)}
                        placeholder="Use {customer_name}, {amount}, {due_date}, {days_overdue}"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Variáveis disponíveis: {"{customer_name}"}, {"{amount}"}, {"{due_date}"}, {"{days_overdue}"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={step.is_enabled}
                          onCheckedChange={(checked) => updateStep(index, "is_enabled", checked)}
                        />
                        <Label className="text-xs">Ativo</Label>
                      </div>
                      {formData.steps.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeStep(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false)
                resetForm()
                setEditingRule(null)
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave}>{editingRule ? "Atualizar" : "Criar"} Régua</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
