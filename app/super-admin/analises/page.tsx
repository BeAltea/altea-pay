"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Download, RefreshCw, TrendingUp, TrendingDown, AlertCircle, Sparkles, Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { runAssertivaManualAnalysis } from "@/app/actions/credit-actions"

interface CreditAnalysis {
  id: string
  customer_id: string
  company_id: string
  document: string
  customer_name: string
  company_name: string
  score: number
  risk_level: "low" | "medium" | "high" | "very_high"
  analysis_type: "free" | "assertiva"
  status: "pending" | "completed" | "failed"
  created_at: string
  completed_at: string | null
}

export default function AnalysesPage() {
  const [analyses, setAnalyses] = useState<CreditAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRisk, setFilterRisk] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false)
  const { toast } = useToast()
  const supabase = createBrowserClient()

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = async () => {
    try {
      setLoading(true)

      const { data: analysesData, error } = await supabase
        .from("credit_profiles")
        .select(`
          *,
          customers!inner(name, document),
          companies!inner(name)
        `)
        .order("created_at", { ascending: false })
        .limit(100)

      if (error) throw error

      const formattedAnalyses =
        analysesData?.map((analysis: any) => ({
          id: analysis.id,
          customer_id: analysis.customer_id,
          company_id: analysis.company_id,
          document: analysis.customers.document,
          customer_name: analysis.customers.name,
          company_name: analysis.companies.name,
          score: analysis.score,
          risk_level: analysis.risk_level,
          analysis_type: analysis.analysis_type,
          status: analysis.status,
          created_at: analysis.created_at,
          completed_at: analysis.completed_at,
        })) || []

      setAnalyses(formattedAnalyses)
    } catch (error: any) {
      console.error("[v0] Error loading analyses:", error)
      toast({
        title: "Erro ao carregar análises",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredAnalyses = analyses.filter((analysis) => {
    const matchesSearch =
      analysis.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      analysis.document.includes(searchTerm) ||
      analysis.company_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRisk = filterRisk === "all" || analysis.risk_level === filterRisk
    const matchesType = filterType === "all" || analysis.analysis_type === filterType

    return matchesSearch && matchesRisk && matchesType
  })

  const getRiskBadge = (risk: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      low: { variant: "default", label: "Baixo", icon: TrendingUp },
      medium: { variant: "secondary", label: "Médio", icon: AlertCircle },
      high: { variant: "destructive", label: "Alto", icon: TrendingDown },
      very_high: { variant: "destructive", label: "Muito Alto", icon: TrendingDown },
    }
    const config = variants[risk] || variants.medium
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: "secondary", label: "Pendente" },
      completed: { variant: "default", label: "Concluída" },
      failed: { variant: "destructive", label: "Falhou" },
    }
    const config = variants[status] || variants.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const stats = {
    total: analyses.length,
    completed: analyses.filter((a) => a.status === "completed").length,
    pending: analyses.filter((a) => a.status === "pending").length,
    highRisk: analyses.filter((a) => a.risk_level === "high" || a.risk_level === "very_high").length,
  }

  const toggleCustomerSelection = (customerId: string) => {
    const newSelection = new Set(selectedCustomers)
    if (newSelection.has(customerId)) {
      newSelection.delete(customerId)
    } else {
      newSelection.add(customerId)
    }
    setSelectedCustomers(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedCustomers.size === filteredAnalyses.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(filteredAnalyses.map((a) => a.customer_id)))
    }
  }

  const handleRunAssertivaAnalysis = async () => {
    if (selectedCustomers.size === 0) {
      toast({
        title: "Nenhum cliente selecionado",
        description: "Selecione pelo menos um cliente para executar a análise.",
        variant: "destructive",
      })
      return
    }

    setShowConfirmModal(true)
  }

  const confirmAndRunAnalysis = async () => {
    setShowConfirmModal(false)
    setIsRunningAnalysis(true)

    try {
      const firstCustomer = analyses.find((a) => selectedCustomers.has(a.customer_id))
      if (!firstCustomer) {
        throw new Error("Cliente não encontrado")
      }

      const result = await runAssertivaManualAnalysis(Array.from(selectedCustomers), firstCustomer.company_id)

      if (result.success) {
        toast({
          title: "Análise concluída!",
          description: result.message,
        })

        await loadAnalyses()

        setSelectedCustomers(new Set())
      } else {
        toast({
          title: "Erro na análise",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[v0] Error running Assertiva analysis:", error)
      toast({
        title: "Erro ao executar análise",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsRunningAnalysis(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Análises de Crédito</h1>
        <p className="text-muted-foreground">Visualize e gerencie todas as análises de crédito realizadas</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Análises</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Concluídas</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alto Risco</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.highRisk}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Fixed button for Assertiva analysis */}
      {selectedCustomers.size > 0 && (
        <Card className="border-2 border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Sparkles className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="text-lg font-semibold">Análise Paga (Assertiva)</h3>
                  <p className="text-sm text-muted-foreground">{selectedCustomers.size} cliente(s) selecionado(s)</p>
                </div>
              </div>
              <Button size="lg" onClick={handleRunAssertivaAnalysis} disabled={isRunningAnalysis} className="gap-2">
                {isRunningAnalysis ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Rodar Análise Paga ({selectedCustomers.size})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, documento ou empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Riscos</SelectItem>
                  <SelectItem value="low">Baixo</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="very_high">Muito Alto</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="free">Gratuita</SelectItem>
                  <SelectItem value="assertiva">Assertiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadAnalyses}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCustomers.size === filteredAnalyses.length && filteredAnalyses.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnalyses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Nenhuma análise encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAnalyses.map((analysis) => (
                    <TableRow key={analysis.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCustomers.has(analysis.customer_id)}
                          onCheckedChange={() => toggleCustomerSelection(analysis.customer_id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{analysis.customer_name}</TableCell>
                      <TableCell>{analysis.document}</TableCell>
                      <TableCell>{analysis.company_name}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{analysis.score}</span>
                      </TableCell>
                      <TableCell>{getRiskBadge(analysis.risk_level)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{analysis.analysis_type === "free" ? "Gratuita" : "Assertiva"}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(analysis.status)}</TableCell>
                      <TableCell>{new Date(analysis.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Confirmar Análise Paga
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>Você está prestes a executar uma análise detalhada usando a API da Assertiva Soluções.</p>

              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="font-semibold text-yellow-900">⚠️ Atenção:</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-yellow-800">
                  <li>Esta ação consome créditos da Assertiva</li>
                  <li>Não pode ser desfeita</li>
                  <li>{selectedCustomers.size} cliente(s) será(ão) analisado(s)</li>
                  <li>O processo pode levar alguns minutos</li>
                </ul>
              </div>

              <p className="text-sm">Deseja continuar?</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAndRunAnalysis} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Confirmar e Executar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
