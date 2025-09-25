"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Mail,
  MessageSquare,
  Phone,
  FileText,
  Target,
  Clock,
  CheckCircle,
} from "lucide-react"

interface CollectionRuleStep {
  id: string
  stepOrder: number
  daysAfterDue: number
  actionType: "email" | "sms" | "whatsapp" | "call" | "letter"
  templateSubject?: string
  templateContent: string
  isActive: boolean
}

interface CollectionRule {
  id: string
  name: string
  description: string
  isActive: boolean
  steps: CollectionRuleStep[]
  createdAt: string
  updatedAt: string
}

export default function CollectionRulesPage() {
  const [rules, setRules] = useState<CollectionRule[]>([])
  const [selectedRule, setSelectedRule] = useState<CollectionRule | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Mock data
  useEffect(() => {
    const mockRules: CollectionRule[] = [
      {
        id: "1",
        name: "Régua Padrão",
        description: "Fluxo padrão de cobrança para dívidas em geral",
        isActive: true,
        createdAt: "2025-01-10T10:00:00Z",
        updatedAt: "2025-01-15T14:30:00Z",
        steps: [
          {
            id: "1-1",
            stepOrder: 1,
            daysAfterDue: 3,
            actionType: "email",
            templateSubject: "Lembrete de Vencimento",
            templateContent:
              "Olá {nome}, sua fatura no valor de R$ {valor} venceu em {data_vencimento}. Por favor, regularize sua situação.",
            isActive: true,
          },
          {
            id: "1-2",
            stepOrder: 2,
            daysAfterDue: 7,
            actionType: "sms",
            templateContent: "Sua fatura de R$ {valor} está em atraso. Acesse nosso site para quitar.",
            isActive: true,
          },
          {
            id: "1-3",
            stepOrder: 3,
            daysAfterDue: 15,
            actionType: "whatsapp",
            templateContent:
              "Olá {nome}! Notamos que sua fatura de R$ {valor} ainda não foi paga. Podemos ajudar com um acordo?",
            isActive: true,
          },
          {
            id: "1-4",
            stepOrder: 4,
            daysAfterDue: 30,
            actionType: "call",
            templateContent: "Script: Verificar situação do cliente e oferecer opções de pagamento",
            isActive: true,
          },
        ],
      },
      {
        id: "2",
        name: "Régua Agressiva",
        description: "Para dívidas de alto valor ou clientes com histórico ruim",
        isActive: false,
        createdAt: "2025-01-05T09:00:00Z",
        updatedAt: "2025-01-12T16:45:00Z",
        steps: [
          {
            id: "2-1",
            stepOrder: 1,
            daysAfterDue: 1,
            actionType: "email",
            templateSubject: "Fatura Vencida - Ação Imediata Necessária",
            templateContent: "Sua fatura venceu ontem. Regularize imediatamente para evitar negativação.",
            isActive: true,
          },
          {
            id: "2-2",
            stepOrder: 2,
            daysAfterDue: 3,
            actionType: "call",
            templateContent: "Ligação imediata para cobrança",
            isActive: true,
          },
          {
            id: "2-3",
            stepOrder: 3,
            daysAfterDue: 7,
            actionType: "letter",
            templateContent: "Notificação formal de cobrança",
            isActive: true,
          },
        ],
      },
    ]
    setRules(mockRules)
  }, [])

  const getActionIcon = (actionType: CollectionRuleStep["actionType"]) => {
    switch (actionType) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "sms":
        return <MessageSquare className="h-4 w-4" />
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />
      case "call":
        return <Phone className="h-4 w-4" />
      case "letter":
        return <FileText className="h-4 w-4" />
    }
  }

  const getActionLabel = (actionType: CollectionRuleStep["actionType"]) => {
    switch (actionType) {
      case "email":
        return "Email"
      case "sms":
        return "SMS"
      case "whatsapp":
        return "WhatsApp"
      case "call":
        return "Ligação"
      case "letter":
        return "Carta"
    }
  }

  const handleToggleRule = (ruleId: string) => {
    setRules(rules.map((rule) => (rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule)))
  }

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter((rule) => rule.id !== ruleId))
  }

  const handleDuplicateRule = (rule: CollectionRule) => {
    const newRule: CollectionRule = {
      ...rule,
      id: Date.now().toString(),
      name: `${rule.name} (Cópia)`,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setRules([...rules, newRule])
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Réguas de Cobrança</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure fluxos automáticos de cobrança para diferentes cenários
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Régua
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Régua de Cobrança</DialogTitle>
              <DialogDescription>Configure um novo fluxo automático de cobrança com múltiplas etapas</DialogDescription>
            </DialogHeader>
            <CreateRuleForm onClose={() => setIsCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg">
                <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Réguas</p>
                <p className="text-2xl font-bold">{rules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ativas</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {rules.filter((r) => r.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-lg">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ações Hoje</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">127</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded-lg">
                <Mail className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">68%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Réguas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Análise</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Réguas de Cobrança</CardTitle>
              <CardDescription>Gerencie seus fluxos automáticos de cobrança</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-semibold text-lg">{rule.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{rule.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {rule.isActive ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              Ativa
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                              Inativa
                            </Badge>
                          )}
                          <Badge variant="outline">{rule.steps.length} etapas</Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch checked={rule.isActive} onCheckedChange={() => handleToggleRule(rule.id)} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedRule(rule)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateRule(rule)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Rule Steps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {rule.steps.map((step, index) => (
                        <div key={step.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="bg-blue-100 dark:bg-blue-900/20 p-1 rounded">
                              {getActionIcon(step.actionType)}
                            </div>
                            <span className="text-sm font-medium">Etapa {step.stepOrder}</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {step.daysAfterDue} dias após vencimento
                          </p>
                          <p className="text-sm font-medium">{getActionLabel(step.actionType)}</p>
                          {step.templateSubject && (
                            <p className="text-xs text-gray-500 mt-1 truncate">{step.templateSubject}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Mensagens</CardTitle>
              <CardDescription>Gerencie os templates usados nas réguas de cobrança</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Templates de Email</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium">Lembrete Amigável</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Para primeiros lembretes de vencimento
                        </p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium">Cobrança Formal</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Para dívidas em atraso</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium">Última Chance</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Antes de ações legais</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Templates de SMS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium">SMS Lembrete</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Mensagem curta de lembrete</p>
                      </div>
                      <div className="border rounded-lg p-3">
                        <h4 className="font-medium">SMS Cobrança</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Cobrança direta por SMS</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance das Réguas</CardTitle>
                <CardDescription>Taxa de sucesso por régua de cobrança</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{rule.steps.length} etapas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {Math.floor(Math.random() * 30 + 50)}%
                        </p>
                        <p className="text-xs text-gray-500">taxa de sucesso</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações por Tipo</CardTitle>
                <CardDescription>Distribuição de ações executadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span>Emails</span>
                    </div>
                    <span className="font-medium">1,247</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      <span>SMS</span>
                    </div>
                    <span className="font-medium">892</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      <span>WhatsApp</span>
                    </div>
                    <span className="font-medium">634</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-orange-600" />
                      <span>Ligações</span>
                    </div>
                    <span className="font-medium">156</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Régua de Cobrança</DialogTitle>
            <DialogDescription>Modifique as configurações da régua selecionada</DialogDescription>
          </DialogHeader>
          {selectedRule && (
            <EditRuleForm
              rule={selectedRule}
              onClose={() => {
                setIsEditDialogOpen(false)
                setSelectedRule(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CreateRuleForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [steps, setSteps] = useState<Omit<CollectionRuleStep, "id">[]>([
    {
      stepOrder: 1,
      daysAfterDue: 3,
      actionType: "email",
      templateSubject: "",
      templateContent: "",
      isActive: true,
    },
  ])

  const addStep = () => {
    setSteps([
      ...steps,
      {
        stepOrder: steps.length + 1,
        daysAfterDue: 7,
        actionType: "email",
        templateSubject: "",
        templateContent: "",
        isActive: true,
      },
    ])
  }

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setSteps(newSteps)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nome da Régua</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Régua Padrão" />
        </div>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição da régua"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Etapas da Régua</h3>
          <Button onClick={addStep} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Etapa
          </Button>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Etapa {step.stepOrder}</h4>
                {steps.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeStep(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Dias após vencimento</Label>
                  <Input
                    type="number"
                    value={step.daysAfterDue}
                    onChange={(e) => updateStep(index, "daysAfterDue", Number.parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Tipo de Ação</Label>
                  <Select value={step.actionType} onValueChange={(value) => updateStep(index, "actionType", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="call">Ligação</SelectItem>
                      <SelectItem value="letter">Carta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={step.isActive}
                    onCheckedChange={(checked) => updateStep(index, "isActive", checked)}
                  />
                  <Label>Ativa</Label>
                </div>
              </div>

              {step.actionType === "email" && (
                <div>
                  <Label>Assunto do Email</Label>
                  <Input
                    value={step.templateSubject || ""}
                    onChange={(e) => updateStep(index, "templateSubject", e.target.value)}
                    placeholder="Assunto do email"
                  />
                </div>
              )}

              <div>
                <Label>Conteúdo da Mensagem</Label>
                <Textarea
                  value={step.templateContent}
                  onChange={(e) => updateStep(index, "templateContent", e.target.value)}
                  placeholder="Conteúdo da mensagem (use {nome}, {valor}, {data_vencimento} para personalizar)"
                  rows={3}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={onClose}>Criar Régua</Button>
      </div>
    </div>
  )
}

function EditRuleForm({ rule, onClose }: { rule: CollectionRule; onClose: () => void }) {
  const [name, setName] = useState(rule.name)
  const [description, setDescription] = useState(rule.description)
  const [steps, setSteps] = useState<CollectionRuleStep[]>(rule.steps)

  const addStep = () => {
    const newStep: CollectionRuleStep = {
      id: Date.now().toString(),
      stepOrder: steps.length + 1,
      daysAfterDue: 7,
      actionType: "email",
      templateSubject: "",
      templateContent: "",
      isActive: true,
    }
    setSteps([...steps, newStep])
  }

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setSteps(newSteps)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-name">Nome da Régua</Label>
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Régua Padrão" />
        </div>
        <div>
          <Label htmlFor="edit-description">Descrição</Label>
          <Input
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição da régua"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Etapas da Régua</h3>
          <Button onClick={addStep} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Etapa
          </Button>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Etapa {step.stepOrder}</h4>
                {steps.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeStep(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Dias após vencimento</Label>
                  <Input
                    type="number"
                    value={step.daysAfterDue}
                    onChange={(e) => updateStep(index, "daysAfterDue", Number.parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Tipo de Ação</Label>
                  <Select value={step.actionType} onValueChange={(value) => updateStep(index, "actionType", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="call">Ligação</SelectItem>
                      <SelectItem value="letter">Carta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={step.isActive}
                    onCheckedChange={(checked) => updateStep(index, "isActive", checked)}
                  />
                  <Label>Ativa</Label>
                </div>
              </div>

              {step.actionType === "email" && (
                <div>
                  <Label>Assunto do Email</Label>
                  <Input
                    value={step.templateSubject || ""}
                    onChange={(e) => updateStep(index, "templateSubject", e.target.value)}
                    placeholder="Assunto do email"
                  />
                </div>
              )}

              <div>
                <Label>Conteúdo da Mensagem</Label>
                <Textarea
                  value={step.templateContent}
                  onChange={(e) => updateStep(index, "templateContent", e.target.value)}
                  placeholder="Conteúdo da mensagem (use {nome}, {valor}, {data_vencimento} para personalizar)"
                  rows={3}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={onClose}>Salvar Alterações</Button>
      </div>
    </div>
  )
}
