"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Building2, Check, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CollectionRule {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  steps: CollectionRuleStep[]
  active_for_companies: string[] | null
}

interface CollectionRuleStep {
  id: string
  collection_rule_id: string
  step_order: number
  days_after_due: number
  channel: string
  template: string
  created_at: string
}

interface Company {
  id: string
  name: string
  cnpj: string
}

export default function SuperAdminCollectionRulesPage() {
  const [rules, setRules] = useState<CollectionRule[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<CollectionRule | null>(null)
  const [assigningRule, setAssigningRule] = useState<CollectionRule | null>(null)
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const { toast } = useToast()
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_active: true,
    steps: [{ step_order: 1, days_after_due: 3, channel: "email", template: "" }],
  })

  useEffect(() => {
    fetchRules()
    fetchCompanies()
  }, [])

  async function fetchRules() {
    try {
      const { data: rulesData, error: rulesError } = await supabase
        .from("collection_rules")
        .select("*")
        .order("created_at", { ascending: false })

      if (rulesError) throw rulesError

      // Fetch steps for each rule
      const rulesWithSteps = await Promise.all(
        (rulesData || []).map(async (rule) => {
          const { data: stepsData } = await supabase
            .from("collection_rule_steps")
            .select("*")
            .eq("collection_rule_id", rule.id)
            .order("step_order")

          return { ...rule, steps: stepsData || [] }
        }),
      )

      setRules(rulesWithSteps)
    } catch (error: any) {
      toast({
        title: "Erro ao carregar réguas",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function fetchCompanies() {
    try {
      const { data, error } = await supabase.from("companies").select("id, name, cnpj").order("name")

      if (error) throw error
      setCompanies(data || [])
    } catch (error: any) {
      console.error("Error fetching companies:", error)
    }
  }

  async function handleSaveRule() {
    try {
      if (editingRule) {
        // Update existing rule
        const { error: ruleError } = await supabase
          .from("collection_rules")
          .update({
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
          })
          .eq("id", editingRule.id)

        if (ruleError) throw ruleError

        // Delete old steps
        await supabase.from("collection_rule_steps").delete().eq("collection_rule_id", editingRule.id)

        // Insert new steps
        const stepsToInsert = formData.steps.map((step) => ({
          collection_rule_id: editingRule.id,
          ...step,
        }))

        const { error: stepsError } = await supabase.from("collection_rule_steps").insert(stepsToInsert)

        if (stepsError) throw stepsError

        toast({
          title: "Régua atualizada",
          description: "A régua de cobrança foi atualizada com sucesso.",
        })
      } else {
        // Create new rule
        const { data: newRule, error: ruleError } = await supabase
          .from("collection_rules")
          .insert({
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
          })
          .select()
          .single()

        if (ruleError) throw ruleError

        // Insert steps
        const stepsToInsert = formData.steps.map((step) => ({
          collection_rule_id: newRule.id,
          ...step,
        }))

        const { error: stepsError } = await supabase.from("collection_rule_steps").insert(stepsToInsert)

        if (stepsError) throw stepsError

        toast({
          title: "Régua criada",
          description: "A régua de cobrança foi criada com sucesso.",
        })
      }

      setShowDialog(false)
      setEditingRule(null)
      resetForm()
      fetchRules()
    } catch (error: any) {
      toast({
        title: "Erro ao salvar régua",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!confirm("Tem certeza que deseja excluir esta régua?")) return

    try {
      const { error } = await supabase.from("collection_rules").delete().eq("id", ruleId)

      if (error) throw error

      toast({
        title: "Régua excluída",
        description: "A régua de cobrança foi excluída com sucesso.",
      })

      fetchRules()
    } catch (error: any) {
      toast({
        title: "Erro ao excluir régua",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleToggleActive(rule: CollectionRule) {
    try {
      const { error } = await supabase.from("collection_rules").update({ is_active: !rule.is_active }).eq("id", rule.id)

      if (error) throw error

      toast({
        title: rule.is_active ? "Régua desativada" : "Régua ativada",
        description: `A régua foi ${rule.is_active ? "desativada" : "ativada"} com sucesso.`,
      })

      fetchRules()
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  async function handleAssignCompanies() {
    if (!assigningRule) return

    try {
      const { error } = await supabase
        .from("collection_rules")
        .update({ active_for_companies: selectedCompanies })
        .eq("id", assigningRule.id)

      if (error) throw error

      toast({
        title: "Empresas atribuídas",
        description: "A régua foi atribuída às empresas selecionadas.",
      })

      setShowAssignDialog(false)
      setAssigningRule(null)
      setSelectedCompanies([])
      fetchRules()
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir empresas",
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
      is_active: rule.is_active,
      steps: rule.steps.map((step) => ({
        step_order: step.step_order,
        days_after_due: step.days_after_due,
        channel: step.channel,
        template: step.template,
      })),
    })
    setEditingRule(rule)
    setShowDialog(true)
  }

  function openAssignDialog(rule: CollectionRule) {
    setAssigningRule(rule)
    setSelectedCompanies(rule.active_for_companies || [])
    setShowAssignDialog(true)
  }

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      is_active: true,
      steps: [{ step_order: 1, days_after_due: 3, channel: "email", template: "" }],
    })
  }

  function addStep() {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          step_order: formData.steps.length + 1,
          days_after_due: 0,
          channel: "email",
          template: "",
        },
      ],
    })
  }

  function removeStep(index: number) {
    const newSteps = formData.steps.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      steps: newSteps.map((step, i) => ({ ...step, step_order: i + 1 })),
    })
  }

  function updateStep(index: number, field: string, value: any) {
    const newSteps = [...formData.steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setFormData({ ...formData, steps: newSteps })
  }

  function toggleCompanySelection(companyId: string) {
    setSelectedCompanies((prev) =>
      prev.includes(companyId) ? prev.filter((id) => id !== companyId) : [...prev, companyId],
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando réguas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Réguas de Cobrança</h1>
          <p className="text-muted-foreground">Gerencie réguas de cobrança e atribua a empresas</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Régua
        </Button>
      </div>

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold">{rule.name}</h3>
                  <Badge variant={rule.is_active ? "default" : "secondary"}>
                    {rule.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                {rule.description && <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{rule.active_for_companies?.length || 0} empresa(s) atribuída(s)</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleToggleActive(rule)}>
                  {rule.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => openAssignDialog(rule)}>
                  <Building2 className="h-4 w-4" />
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
                  <Badge variant="outline">Etapa {step.step_order}</Badge>
                  <span>{step.days_after_due} dias após vencimento</span>
                  <Badge>{step.channel}</Badge>
                  <span className="text-muted-foreground truncate flex-1">{step.template.substring(0, 50)}...</span>
                </div>
              ))}
            </div>
          </Card>
        ))}

        {rules.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhuma régua de cobrança cadastrada</p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Régua
            </Button>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar Régua" : "Nova Régua"}</DialogTitle>
            <DialogDescription>Configure as etapas de cobrança automática</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Régua</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Régua Padrão"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o objetivo desta régua"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active">Régua ativa</Label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Etapas</h4>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Etapa
                </Button>
              </div>

              {formData.steps.map((step, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Dias após vencimento</Label>
                          <Input
                            type="number"
                            value={step.days_after_due}
                            onChange={(e) => updateStep(index, "days_after_due", Number.parseInt(e.target.value) || 0)}
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
                              <SelectItem value="phone">Ligação</SelectItem>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRule}>Salvar Régua</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Companies Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Empresas</DialogTitle>
            <DialogDescription>Selecione as empresas que usarão esta régua</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted"
                onClick={() => toggleCompanySelection(company.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedCompanies.includes(company.id)}
                  onChange={() => toggleCompanySelection(company.id)}
                  className="rounded"
                />
                <div className="flex-1">
                  <p className="font-medium">{company.name}</p>
                  <p className="text-sm text-muted-foreground">{company.cnpj}</p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignCompanies}>Atribuir ({selectedCompanies.length})</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
