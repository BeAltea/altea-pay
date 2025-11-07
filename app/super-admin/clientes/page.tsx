"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, RefreshCw, Sparkles, Loader2, Building2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { runAssertivaManualAnalysis } from "@/app/actions/credit-actions"
import { runGovernmentAnalysis } from "@/app/actions/credit-actions"
import { createBrowserClient } from "@/lib/supabase/client"

interface Customer {
  id: string
  "CPF/CNPJ": string
  Cliente: string
  Cidade: string
  Empresa: string
  id_company: string
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [analysisType, setAnalysisType] = useState<"gov" | "assertiva">("gov")
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const supabase = createBrowserClient()

      const { data, error } = await supabase
        .from("VMAX")
        .select('id, "CPF/CNPJ", Cliente, Cidade, Empresa, id_company')
        .order("Cliente", { ascending: true })

      if (error) throw error

      setCustomers(data || [])
    } catch (error: any) {
      console.error("[v0] ClientesPage - Error loading customers:", error)
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.Cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer["CPF/CNPJ"]?.includes(searchTerm) ||
      customer.Cidade?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map((c) => c.id)))
    }
  }

  const handleRunAnalysis = (type: "gov" | "assertiva") => {
    if (selectedCustomers.size === 0) {
      toast({
        title: "Nenhum cliente selecionado",
        description: "Selecione pelo menos um cliente para executar a análise.",
        variant: "destructive",
      })
      return
    }

    setAnalysisType(type)
    setShowConfirmModal(true)
  }

  const confirmAndRunAnalysis = async () => {
    setShowConfirmModal(false)
    setIsRunningAnalysis(true)

    try {
      const firstCustomer = customers.find((c) => selectedCustomers.has(c.id))
      if (!firstCustomer) {
        throw new Error("Cliente não encontrado")
      }

      const customerIdsToAnalyze = Array.from(selectedCustomers)

      let result
      if (analysisType === "assertiva") {
        result = await runAssertivaManualAnalysis(customerIdsToAnalyze, firstCustomer.id_company)
      } else {
        result = await runGovernmentAnalysis(customerIdsToAnalyze, firstCustomer.id_company)
      }

      if (result.success) {
        const durationInSeconds =
          result.duration && typeof result.duration === "number" ? (result.duration / 1000).toFixed(2) : "0.00"

        toast({
          title: "Análise concluída!",
          description: `Análise ${analysisType === "assertiva" ? "Assertiva" : "do Governo"} concluída com sucesso!

📊 Resumo:
- Total de clientes selecionados: ${result.total}
- Análises realizadas: ${result.analyzed}
- Já tinham análise (cache): ${result.cached}
- Falhas: ${result.failed}
- Tempo total: ${durationInSeconds}s`,
        })

        setSelectedCustomers(new Set())
      } else {
        toast({
          title: "Erro na análise",
          description: result.error || "Erro desconhecido",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[v0] ClientesPage - Error running analysis:", error)
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
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">Selecione clientes e execute análises de crédito</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Total de Clientes</CardDescription>
            <CardTitle className="text-3xl text-foreground">{customers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Selecionados</CardDescription>
            <CardTitle className="text-3xl text-blue-600 dark:text-blue-400">{selectedCustomers.size}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Filtrados</CardDescription>
            <CardTitle className="text-3xl text-green-600 dark:text-green-400">{filteredCustomers.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Action Buttons */}
      {selectedCustomers.size > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-2 border-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Análise Gratuita (Governo)</h3>
                    <p className="text-sm text-muted-foreground">{selectedCustomers.size} cliente(s) selecionado(s)</p>
                  </div>
                </div>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleRunAnalysis("gov")}
                  disabled={isRunningAnalysis}
                  className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {isRunningAnalysis && analysisType === "gov" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Building2 className="h-5 w-5" />
                      Rodar Análise Gratuita
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Análise Paga (Assertiva)</h3>
                    <p className="text-sm text-muted-foreground">{selectedCustomers.size} cliente(s) selecionado(s)</p>
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={() => handleRunAnalysis("assertiva")}
                  disabled={isRunningAnalysis}
                  className="gap-2"
                >
                  {isRunningAnalysis && analysisType === "assertiva" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Rodar Análise Paga
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, CPF ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadCustomers}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Empresa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {loading ? "Carregando..." : "Nenhum cliente encontrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCustomers.has(customer.id)}
                          onCheckedChange={() => toggleCustomerSelection(customer.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{customer.Cliente}</TableCell>
                      <TableCell className="text-foreground">{customer["CPF/CNPJ"]}</TableCell>
                      <TableCell className="text-foreground">{customer.Cidade}</TableCell>
                      <TableCell className="text-foreground">{customer.Empresa}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Confirmar Análise {analysisType === "assertiva" ? "Paga" : "Gratuita"}
            </DialogTitle>
            <div className="space-y-4 pt-4 text-sm text-muted-foreground">
              <p>
                Você está prestes a executar uma análise{" "}
                {analysisType === "assertiva"
                  ? "detalhada usando a API da Assertiva Soluções"
                  : "gratuita usando o Portal da Transparência do Governo Federal"}
                .
              </p>

              {analysisType === "assertiva" && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:bg-yellow-950/20">
                  <p className="font-semibold text-yellow-900 dark:text-yellow-100">⚠️ Atenção:</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                    <li>Esta ação consome créditos da Assertiva</li>
                    <li>Não pode ser desfeita</li>
                    <li>{selectedCustomers.size} cliente(s) será(ão) analisado(s)</li>
                    <li>O processo pode levar alguns minutos</li>
                  </ul>
                </div>
              )}

              <p className="text-sm">Deseja continuar?</p>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmAndRunAnalysis} className="gap-2">
              {analysisType === "assertiva" ? <Sparkles className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              Confirmar e Executar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
