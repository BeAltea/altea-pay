"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, Sparkles, Loader2, Building2, AlertCircle, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { runAssertivaManualAnalysis } from "@/app/actions/credit-actions"
import { runGovernmentAnalysis } from "@/app/actions/credit-actions"
import { getAllCustomers } from "@/app/actions/analyses-actions"
import { createBrowserClient } from "@/supabase/supabase-browser"

interface Customer {
  id: string
  name: string
  document: string
  city: string
  company_name: string
  company_id: string
  source_table: "customers" | "vmax"
  dias_inad?: number
}

interface CreditProfile {
  id: string
  source: "gov" | "assertiva" | "consolidated"
  score_gov?: number
  score_assertiva?: number
  data_gov?: any
  data_assertiva?: any
  is_consolidated?: boolean
  created_at: string
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [analysisType, setAnalysisType] = useState<"gov" | "assertiva" | "consolidated">("gov")
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false)

  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<Customer | null>(null)
  const [customerProfile, setCustomerProfile] = useState<CreditProfile | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      setLoading(true)

      const response = await getAllCustomers()

      if (response.success) {
        setCustomers(response.data)
      } else {
        toast({
          title: "Erro ao carregar clientes",
          description: response.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const viewCustomerDetails = async (customer: Customer) => {
    setSelectedCustomerDetails(customer)
    setShowDetailsModal(true)
    setLoadingDetails(true)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const cleanDocument = customer.document.replace(/\D/g, "")

      const { data: profile, error } = await supabase
        .from("credit_profiles")
        .select("*")
        .eq("cpf", cleanDocument)
        .eq("company_id", customer.company_id)
        .maybeSingle()

      if (error) {
        console.error("Error loading profile:", error)
        toast({
          title: "Erro ao carregar análise",
          description: "Não foi possível carregar os detalhes da análise.",
          variant: "destructive",
        })
      } else if (!profile) {
        toast({
          title: "Nenhuma análise encontrada",
          description: "Este cliente ainda não possui análises de crédito.",
          variant: "destructive",
        })
        setShowDetailsModal(false)
      } else {
        setCustomerProfile(profile)
      }
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.document?.includes(searchTerm) ||
      customer.city?.toLowerCase().includes(searchTerm.toLowerCase()),
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

  const handleRunAnalysis = (type: "gov" | "assertiva" | "consolidated") => {
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

      if (analysisType === "consolidated") {
        const govResult = await runGovernmentAnalysis(customerIdsToAnalyze, firstCustomer.company_id)
        const assertivaResult = await runAssertivaManualAnalysis(customerIdsToAnalyze, firstCustomer.company_id)

        if (govResult.success && assertivaResult.success) {
          const totalDuration = (govResult.duration || 0) + (assertivaResult.duration || 0)
          const durationInSeconds = totalDuration ? (totalDuration / 1000).toFixed(2) : "0.00"

          toast({
            title: "Análise Consolidada concluída!",
            description: `Perfil consolidado criado com sucesso!

📊 Resumo Geral:
- Total de clientes: ${selectedCustomers.size}

📋 Análise do Governo:
- Análises realizadas: ${govResult.analyzed}
- Cache: ${govResult.cached}
- Falhas: ${govResult.failed}

💎 Análise Assertiva:
- Análises realizadas: ${assertivaResult.analyzed}
- Cache: ${assertivaResult.cached}
- Falhas: ${assertivaResult.failed}

⏱️ Tempo total: ${durationInSeconds}s`,
          })

          setSelectedCustomers(new Set())
        } else {
          const errors = []
          if (!govResult.success) errors.push(`Governo: ${govResult.error}`)
          if (!assertivaResult.success) errors.push(`Assertiva: ${assertivaResult.error}`)

          toast({
            title: "Erro na análise consolidada",
            description: errors.join(" | "),
            variant: "destructive",
          })
        }
      } else {
        let result
        if (analysisType === "assertiva") {
          result = await runAssertivaManualAnalysis(customerIdsToAnalyze, firstCustomer.company_id)
        } else {
          result = await runGovernmentAnalysis(customerIdsToAnalyze, firstCustomer.company_id)
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
      }
    } catch (error: any) {
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
        <h1 className="text-3xl font-bold">Análise Gov/Assertiva</h1>
        <p className="text-muted-foreground">Selecione clientes e execute análises de crédito consolidadas</p>
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-2 border-blue-500">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-7 w-7 text-blue-600" />
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Análise Gratuita</h3>
                    <p className="text-xs text-muted-foreground">Governo</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{selectedCustomers.size} cliente(s) selecionado(s)</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRunAnalysis("gov")}
                  disabled={isRunningAnalysis}
                  className="w-full gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  {isRunningAnalysis && analysisType === "gov" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4" />
                      Rodar Análise Gratuita
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-7 w-7 text-primary" />
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Análise Paga</h3>
                    <p className="text-xs text-muted-foreground">Assertiva</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{selectedCustomers.size} cliente(s) selecionado(s)</p>
                <Button
                  size="sm"
                  onClick={() => handleRunAnalysis("assertiva")}
                  disabled={isRunningAnalysis}
                  className="w-full gap-2"
                >
                  {isRunningAnalysis && analysisType === "assertiva" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Rodar Análise Paga
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-500">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Building2 className="absolute h-7 w-7 text-blue-600" />
                    <Sparkles className="relative left-3 top-3 h-4 w-4 text-primary" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-base font-semibold text-foreground">Perfil Consolidado</h3>
                    <p className="text-xs text-muted-foreground">Governo + Assertiva</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{selectedCustomers.size} cliente(s) selecionado(s)</p>
                <Button
                  size="sm"
                  onClick={() => handleRunAnalysis("consolidated")}
                  disabled={isRunningAnalysis}
                  className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  {isRunningAnalysis && analysisType === "consolidated" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Building2 className="h-3 w-3" />
                      <Sparkles className="h-3 w-3" />
                      Rodar Análise Completa
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
                  <TableHead>Dias em Atraso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-foreground">{customer.document}</TableCell>
                      <TableCell className="text-foreground">{customer.city}</TableCell>
                      <TableCell className="text-foreground">{customer.company_name}</TableCell>
                      <TableCell>
                        {customer.dias_inad && customer.dias_inad > 0 ? (
                          <Badge
                            variant={
                              customer.dias_inad <= 30
                                ? "secondary"
                                : customer.dias_inad <= 60
                                  ? "default"
                                  : customer.dias_inad <= 90
                                    ? "default"
                                    : "destructive"
                            }
                            className={
                              customer.dias_inad <= 30
                                ? "bg-yellow-100 text-yellow-800"
                                : customer.dias_inad <= 60
                                  ? "bg-orange-100 text-orange-800"
                                  : customer.dias_inad <= 90
                                    ? "bg-red-100 text-red-800"
                                    : "bg-red-600 text-white"
                            }
                          >
                            {customer.dias_inad} dias
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Em dia</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewCustomerDetails(customer)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Button>
                      </TableCell>
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
              Confirmar Análise{" "}
              {analysisType === "assertiva" ? "Paga" : analysisType === "consolidated" ? "Consolidada" : "Gratuita"}
            </DialogTitle>
            <div className="space-y-4 pt-4 text-sm text-muted-foreground">
              {analysisType === "consolidated" ? (
                <>
                  <p>
                    Você está prestes a executar uma <strong>análise completa</strong> que combina dados do Portal da
                    Transparência do Governo Federal e da API da Assertiva Soluções.
                  </p>

                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:bg-purple-950/20">
                    <p className="font-semibold text-purple-900 dark:text-purple-100">✨ Perfil Consolidado:</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-purple-800 dark:text-purple-200">
                      <li>Combina análise gratuita do governo com análise paga da Assertiva</li>
                      <li>Cria um perfil completo do cliente com todas as informações disponíveis</li>
                      <li>Consome créditos da Assertiva</li>
                      <li>{selectedCustomers.size} cliente(s) será(ão) analisado(s)</li>
                      <li>O processo pode levar alguns minutos (duas análises por cliente)</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

              <p className="text-sm">Deseja continuar?</p>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmAndRunAnalysis}
              className={`gap-2 ${analysisType === "consolidated" ? "bg-purple-600 hover:bg-purple-700" : ""}`}
            >
              {analysisType === "assertiva" ? (
                <Sparkles className="h-4 w-4" />
              ) : analysisType === "consolidated" ? (
                <>
                  <Building2 className="h-3 w-3" />
                  <Sparkles className="h-3 w-3" />
                </>
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              Confirmar e Executar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Análise de Crédito</DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : customerProfile && selectedCustomerDetails ? (
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedCustomerDetails.name}</span>
                    {customerProfile.is_consolidated && <Badge className="bg-purple-600">Perfil Consolidado</Badge>}
                  </CardTitle>
                  <CardDescription>
                    CPF/CNPJ: {selectedCustomerDetails.document} | Cidade: {selectedCustomerDetails.city}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Scores */}
              <div className="grid gap-4 md:grid-cols-2">
                {customerProfile.score_gov !== null && customerProfile.score_gov !== undefined && (
                  <Card className="border-blue-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        Análise do Governo
                      </CardTitle>
                      <CardDescription>Portal da Transparência</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-blue-600">{customerProfile.score_gov}</div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {customerProfile.data_gov?.total_sancoes || 0} sanção(ões) encontrada(s)
                      </p>
                    </CardContent>
                  </Card>
                )}

                {customerProfile.score_assertiva !== null && customerProfile.score_assertiva !== undefined && (
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Análise Assertiva
                      </CardTitle>
                      <CardDescription>Assertiva Soluções</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-primary">{customerProfile.score_assertiva}</div>
                      <p className="text-sm text-muted-foreground mt-2">Score de crédito completo</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Government Data */}
              {customerProfile.data_gov && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-600">Dados do Governo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold">Situação CPF/CNPJ:</p>
                      <Badge variant={customerProfile.data_gov.situacao_cpf === "REGULAR" ? "default" : "destructive"}>
                        {customerProfile.data_gov.situacao_cpf || "N/A"}
                      </Badge>
                    </div>

                    {customerProfile.data_gov.sancoes_ceis?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2">CEIS (Sanções):</p>
                        <p className="text-sm text-muted-foreground">
                          {customerProfile.data_gov.sancoes_ceis.length} sanção(ões) encontrada(s)
                        </p>
                      </div>
                    )}

                    {customerProfile.data_gov.punicoes_cnep?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2">CNEP (Punições):</p>
                        <p className="text-sm text-muted-foreground">
                          {customerProfile.data_gov.punicoes_cnep.length} punição(ões) encontrada(s)
                        </p>
                      </div>
                    )}

                    {selectedCustomerDetails?.dias_inad && selectedCustomerDetails.dias_inad > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2">Dias em Atraso:</p>
                        <Badge
                          variant="destructive"
                          className={`text-lg ${
                            selectedCustomerDetails.dias_inad <= 30
                              ? "bg-yellow-500"
                              : selectedCustomerDetails.dias_inad <= 60
                                ? "bg-orange-500"
                                : selectedCustomerDetails.dias_inad <= 90
                                  ? "bg-red-500"
                                  : "bg-red-700"
                          }`}
                        >
                          ⚠️ {selectedCustomerDetails.dias_inad} dias de inadimplência
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Assertiva Data */}
              {customerProfile.data_assertiva && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-primary">Dados Assertiva</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {customerProfile.data_assertiva.score_recupere && (
                      <div>
                        <p className="text-sm font-semibold">Score Recupere:</p>
                        <p className="text-2xl font-bold">{customerProfile.data_assertiva.score_recupere}</p>
                      </div>
                    )}

                    {customerProfile.data_assertiva.renda_presumida && (
                      <div>
                        <p className="text-sm font-semibold">Renda Presumida:</p>
                        <p className="text-lg">R$ {customerProfile.data_assertiva.renda_presumida}</p>
                      </div>
                    )}

                    {customerProfile.data_assertiva.credito?.resposta?.registrosDebitos?.list?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2">Débitos:</p>
                        <p className="text-sm text-muted-foreground">
                          {customerProfile.data_assertiva.credito.resposta.registrosDebitos.list.length} débito(s)
                          encontrado(s)
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Nenhuma análise encontrada para este cliente.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
