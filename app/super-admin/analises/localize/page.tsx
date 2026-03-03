"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react"

// Types
interface Company {
  id: string
  name: string
}

interface Client {
  id: string
  name: string
  cpf_cnpj: string
  document_type: "cpf" | "cnpj"
  email: string | null
  phone: string | null
  phone2: string | null
  last_assertiva_query: string | null
  status: "complete" | "no_email" | "no_phone" | "no_data"
}

interface SearchResult {
  client_id: string
  client_name: string
  cpf_cnpj: string
  document_type: "cpf" | "cnpj"
  current_email: string | null
  current_phone: string | null
  found_email: string | null
  found_phones: {
    best: {
      numero: string
      tipo: "movel" | "fixo"
      whatsapp: boolean
      hotphone: boolean
      relacao: string
    } | null
    all_moveis: Array<{
      numero: string
      whatsapp: boolean
      hotphone: boolean
      relacao: string
      naoPerturbe: boolean
    }>
    all_fixos: Array<{
      numero: string
      relacao: string
      naoPerturbe: boolean
    }>
  }
  all_emails: string[]
  status: "success" | "not_found" | "error"
  error_message?: string
  assertiva_protocolo: string | null
  applied?: boolean
}

interface Summary {
  total: number
  with_email: number
  without_email: number
  with_phone: number
  without_phone: number
}

interface Pagination {
  total: number
  page: number
  per_page: number
  total_pages: number
}

type FilterType = "all" | "no_email" | "no_phone" | "incomplete"

export default function LocalizePage() {
  const { toast } = useToast()

  // State
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>("")
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<FilterType>("all")
  const [search, setSearch] = useState("")
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    per_page: 50,
    total_pages: 0,
  })
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    with_email: 0,
    without_email: 0,
    with_phone: 0,
    without_phone: 0,
  })
  const [loading, setLoading] = useState(false)
  const [loadingCompanies, setLoadingCompanies] = useState(true)

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)
  const [currentSearchClient, setCurrentSearchClient] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchSummary, setSearchSummary] = useState({
    total_consulted: 0,
    success: 0,
    emails_found: 0,
    phones_found: 0,
    not_found: 0,
    errors: 0,
  })
  const [isSearching, setIsSearching] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Load companies on mount
  useEffect(() => {
    loadCompanies()
  }, [])

  // Load clients when company, filter, or refresh trigger changes
  useEffect(() => {
    if (selectedCompany) {
      loadClients()
    }
  }, [selectedCompany, filter, pagination.page, search, refreshTrigger])

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true)
      console.log("[Localize] Fetching companies...")
      const res = await fetch("/api/companies")
      const data = await res.json()

      if (!res.ok) {
        console.error("[Localize] API error:", data)
        toast({
          title: "Erro ao carregar empresas",
          description: data.details || data.error || "Erro desconhecido",
          variant: "destructive",
        })
        return
      }

      console.log("[Localize] Companies loaded:", data.companies?.length || 0)
      setCompanies(data.companies || [])
    } catch (error) {
      console.error("[Localize] Error loading companies:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as empresas",
        variant: "destructive",
      })
    } finally {
      setLoadingCompanies(false)
    }
  }

  const loadClients = async () => {
    if (!selectedCompany) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        company_id: selectedCompany,
        filter,
        page: pagination.page.toString(),
        per_page: pagination.per_page.toString(),
        ...(search && { search }),
      })

      const res = await fetch(`/api/super-admin/localize/clients?${params}`)
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
        setPagination(data.pagination || pagination)
        setSummary(data.summary || summary)
      } else {
        throw new Error("Erro ao carregar clientes")
      }
    } catch (error) {
      console.error("Error loading clients:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedClients.size === clients.length) {
      setSelectedClients(new Set())
    } else {
      setSelectedClients(new Set(clients.map((c) => c.id)))
    }
  }

  const handleSelectClient = (id: string) => {
    const newSelected = new Set(selectedClients)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedClients(newSelected)
  }

  const handleSearch = async () => {
    if (selectedClients.size === 0) return

    setShowConfirmModal(false)
    setShowProgressModal(true)
    setIsSearching(true)
    setSearchProgress(0)
    setCurrentSearchClient("")

    try {
      const res = await fetch("/api/super-admin/localize/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_ids: Array.from(selectedClients),
          company_id: selectedCompany,
        }),
      })

      if (!res.ok) {
        throw new Error("Erro na consulta")
      }

      const data = await res.json()

      // Check if the request was queued for async processing
      if (data.queued) {
        // Start polling for progress
        const jobId = data.job_id
        let pollCount = 0
        const maxPolls = 600 // 20 minutes max (2s intervals)

        const pollStatus = async () => {
          try {
            const statusRes = await fetch(`/api/super-admin/localize/status?job_id=${jobId}`)
            if (!statusRes.ok) throw new Error("Erro ao verificar status")

            const statusData = await statusRes.json()
            const progress = statusData.progress || {}

            setSearchProgress(progress.percentage || 0)
            setCurrentSearchClient(progress.currentClientName || "")
            setSearchSummary({
              total_consulted: progress.processed || 0,
              success: progress.emailsFound + progress.phonesFound,
              emails_found: progress.emailsFound || 0,
              phones_found: progress.phonesFound || 0,
              not_found: progress.notFound || 0,
              errors: progress.errors || 0,
            })

            if (statusData.status === "completed") {
              setSearchProgress(100)
              setIsSearching(false)

              // Fetch results from logs
              toast({
                title: "Processamento concluído",
                description: `${progress.emailsFound} emails e ${progress.phonesFound} telefones encontrados`,
              })

              setTimeout(() => {
                setShowProgressModal(false)
                setSelectedClients(new Set())
                // Force re-fetch by incrementing trigger
                setRefreshTrigger((prev) => prev + 1)
              }, 1000)
              return
            }

            if (statusData.status === "failed") {
              throw new Error(statusData.failedReason || "Erro no processamento")
            }

            // Continue polling
            pollCount++
            if (pollCount < maxPolls) {
              setTimeout(pollStatus, 2000)
            } else {
              throw new Error("Timeout aguardando processamento")
            }
          } catch (pollError: any) {
            console.error("Polling error:", pollError)
            toast({
              title: "Erro",
              description: pollError.message,
              variant: "destructive",
            })
            setShowProgressModal(false)
            setIsSearching(false)
          }
        }

        // Start polling
        setTimeout(pollStatus, 2000)
        return
      }

      // Synchronous processing - show results directly
      setSearchResults(data.results || [])
      setSearchSummary(data.summary || searchSummary)
      setSearchProgress(100)

      // Show results modal
      setTimeout(() => {
        setShowProgressModal(false)
        setShowResultsModal(true)
      }, 500)
    } catch (error: any) {
      console.error("Search error:", error)
      toast({
        title: "Erro na consulta",
        description: error.message,
        variant: "destructive",
      })
      setShowProgressModal(false)
    } finally {
      setIsSearching(false)
    }
  }

  const handleApplyResult = async (result: SearchResult) => {
    if (result.applied) return
    if (!result.found_email && !result.found_phones.best) return

    // Check if there's anything to apply
    const canApplyEmail = result.found_email && !result.current_email
    const canApplyPhone = result.found_phones.best && !result.current_phone

    if (!canApplyEmail && !canApplyPhone) {
      toast({
        title: "Nada para aplicar",
        description: "Os dados já existem no cadastro",
      })
      return
    }

    try {
      setIsApplying(true)
      const res = await fetch("/api/super-admin/localize/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: selectedCompany,
          updates: [
            {
              client_id: result.client_id,
              email: canApplyEmail ? result.found_email : undefined,
              phone: canApplyPhone ? result.found_phones.best?.numero : undefined,
              whatsapp: result.found_phones.best?.whatsapp,
              assertiva_protocolo: result.assertiva_protocolo,
            },
          ],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.updated > 0) {
          // Mark as applied
          setSearchResults((prev) =>
            prev.map((r) =>
              r.client_id === result.client_id ? { ...r, applied: true } : r
            )
          )
          toast({
            title: "Sucesso",
            description: "Cadastro atualizado",
          })
        } else {
          toast({
            title: "Aviso",
            description: data.details?.[0]?.skipped_reason || "Nenhum campo atualizado",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar",
        variant: "destructive",
      })
    } finally {
      setIsApplying(false)
    }
  }

  const handleApplyAll = async () => {
    const toApply = searchResults.filter(
      (r) =>
        !r.applied &&
        r.status === "success" &&
        ((r.found_email && !r.current_email) || (r.found_phones.best && !r.current_phone))
    )

    if (toApply.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum cadastro para atualizar",
      })
      return
    }

    try {
      setIsApplying(true)
      const res = await fetch("/api/super-admin/localize/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: selectedCompany,
          updates: toApply.map((r) => ({
            client_id: r.client_id,
            email: r.found_email && !r.current_email ? r.found_email : undefined,
            phone:
              r.found_phones.best && !r.current_phone
                ? r.found_phones.best.numero
                : undefined,
            whatsapp: r.found_phones.best?.whatsapp,
            assertiva_protocolo: r.assertiva_protocolo,
          })),
        }),
      })

      if (res.ok) {
        const data = await res.json()

        toast({
          title: "Sucesso",
          description: `${data.updated} cadastros atualizados`,
        })

        // Close modal and refresh table after successful update
        closeResultsAndRefresh()
      } else {
        const data = await res.json()
        toast({
          title: "Erro",
          description: data.error || "Não foi possível atualizar",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar",
        variant: "destructive",
      })
    } finally {
      setIsApplying(false)
    }
  }

  const closeResultsAndRefresh = () => {
    setShowResultsModal(false)
    setSearchResults([])
    setSelectedClients(new Set())
    // Force re-fetch by incrementing trigger (useEffect will call loadClients)
    setRefreshTrigger((prev) => prev + 1)
  }

  const formatDocument = (doc: string) => {
    const clean = doc.replace(/\D/g, "")
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    } else if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
    }
    return doc
  }

  const getStatusBadge = (status: Client["status"]) => {
    switch (status) {
      case "complete":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completo
          </Badge>
        )
      case "no_email":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Sem email
          </Badge>
        )
      case "no_phone":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Sem telefone
          </Badge>
        )
      case "no_data":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Sem dados
          </Badge>
        )
    }
  }

  const selectedWithoutEmail = clients.filter(
    (c) => selectedClients.has(c.id) && !c.email
  ).length
  const selectedWithoutPhone = clients.filter(
    (c) => selectedClients.has(c.id) && !c.phone
  ).length

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-altea-gold/10 p-2 rounded-lg">
            <MapPin className="h-6 w-6 text-altea-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Localize — Enriquecimento Cadastral
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Consulte e atualize emails e telefones de clientes
            </p>
          </div>
        </div>
      </div>

      {/* Company Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Selecione a Empresa</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCompanies ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Carregando empresas...</span>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-gray-500">
              Nenhuma empresa encontrada.{" "}
              <Button variant="link" className="p-0 h-auto" onClick={loadCompanies}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <Select
              value={selectedCompany}
              onValueChange={(value) => {
                setSelectedCompany(value)
                setSelectedClients(new Set())
                setPagination((p) => ({ ...p, page: 1 }))
              }}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Selecione uma empresa..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedCompany && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.total}
                </div>
                <div className="text-xs text-gray-500">Total</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {summary.with_email}
                </div>
                <div className="text-xs text-green-600">Com email</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {summary.without_email}
                </div>
                <div className="text-xs text-yellow-600">Sem email</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {summary.with_phone}
                </div>
                <div className="text-xs text-green-600">Com telefone</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {summary.without_phone}
                </div>
                <div className="text-xs text-yellow-600">Sem telefone</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: "all", label: "Todos" },
                      { value: "no_email", label: "Sem Email" },
                      { value: "no_phone", label: "Sem Telefone" },
                      { value: "incomplete", label: "Dados Incompletos" },
                    ] as const
                  ).map((f) => (
                    <Button
                      key={f.value}
                      variant={filter === f.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setFilter(f.value)
                        setPagination((p) => ({ ...p, page: 1 }))
                      }}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar por nome ou CPF/CNPJ..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-64"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => loadClients()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Bar */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Exibindo {clients.length} de {pagination.total} clientes
              {selectedClients.size > 0 && (
                <span className="ml-2 font-medium text-altea-gold">
                  | {selectedClients.size} selecionados
                </span>
              )}
            </div>
            <Button
              onClick={() => setShowConfirmModal(true)}
              disabled={selectedClients.size === 0}
              className="bg-altea-gold hover:bg-altea-gold/90 text-altea-navy"
            >
              <Search className="w-4 h-4 mr-2" />
              Enriquecer Cadastro
              {selectedClients.size > 0 && ` (${selectedClients.size})`}
            </Button>
          </div>

          {/* Clients Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          clients.length > 0 &&
                          selectedClients.size === clients.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última Consulta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedClients.has(client.id)}
                            onCheckedChange={() => handleSelectClient(client.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatDocument(client.cpf_cnpj)}
                        </TableCell>
                        <TableCell>
                          {client.email ? (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span className="text-sm truncate max-w-[200px]">
                                {client.email}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {client.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span className="text-sm">{client.phone}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(client.status)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {client.last_assertiva_query
                            ? new Date(client.last_assertiva_query).toLocaleDateString(
                                "pt-BR"
                              )
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex justify-center items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                }
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-500">
                Página {pagination.page} de {pagination.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: Math.min(p.total_pages, p.page + 1),
                  }))
                }
                disabled={pagination.page === pagination.total_pages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Confirm Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Consulta</DialogTitle>
            <DialogDescription>
              Deseja enriquecer o cadastro de {selectedClients.size} clientes?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  Cada consulta gera custo na API. Confirme para prosseguir.
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{selectedWithoutEmail} sem email</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{selectedWithoutPhone} sem telefone</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSearch}
              className="bg-altea-gold hover:bg-altea-gold/90 text-altea-navy"
            >
              Confirmar Consulta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Consultando dados...</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <Progress value={searchProgress} className="mb-4" />
            <div className="text-center text-sm text-gray-500 space-y-2">
              {isSearching ? (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Processando {searchSummary.total_consulted} de {selectedClients.size}...
                    </span>
                  </div>
                  {currentSearchClient && (
                    <div className="text-xs truncate max-w-[300px] mx-auto">
                      {currentSearchClient}
                    </div>
                  )}
                  <div className="flex justify-center gap-4 text-xs mt-3">
                    <span className="text-green-600">
                      📧 {searchSummary.emails_found} emails
                    </span>
                    <span className="text-blue-600">
                      📱 {searchSummary.phones_found} telefones
                    </span>
                  </div>
                </>
              ) : (
                <span>Concluído!</span>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Modal */}
      <Dialog open={showResultsModal} onOpenChange={closeResultsAndRefresh}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Consulta Finalizada
            </DialogTitle>
          </DialogHeader>

          {/* Summary */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 py-4 border-b">
            <div className="text-center">
              <div className="text-xl font-bold">{searchSummary.total_consulted}</div>
              <div className="text-xs text-gray-500">Consultados</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">
                {searchSummary.success}
              </div>
              <div className="text-xs text-gray-500">Com dados</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">
                {searchSummary.emails_found}
              </div>
              <div className="text-xs text-gray-500">Emails</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">
                {searchSummary.phones_found}
              </div>
              <div className="text-xs text-gray-500">Telefones</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-400">
                {searchSummary.not_found}
              </div>
              <div className="text-xs text-gray-500">Não encontrados</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-600">
                {searchSummary.errors}
              </div>
              <div className="text-xs text-gray-500">Erros</div>
            </div>
          </div>

          {/* Results Table */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Email Encontrado</TableHead>
                  <TableHead>Telefone Encontrado</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="w-24">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((result) => {
                  const canApplyEmail = result.found_email && !result.current_email
                  const canApplyPhone =
                    result.found_phones.best && !result.current_phone

                  return (
                    <TableRow key={result.client_id}>
                      <TableCell className="font-medium">
                        {result.client_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatDocument(result.cpf_cnpj)}
                      </TableCell>
                      <TableCell>
                        {result.found_email ? (
                          <span
                            className={
                              canApplyEmail
                                ? "text-green-600 font-medium"
                                : "text-gray-600"
                            }
                          >
                            {result.found_email}
                          </span>
                        ) : (
                          <span className="text-gray-400">— Não encontrado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.found_phones.best ? (
                          <span
                            className={
                              canApplyPhone
                                ? "text-green-600 font-medium"
                                : "text-gray-600"
                            }
                          >
                            {result.found_phones.best.numero}
                          </span>
                        ) : (
                          <span className="text-gray-400">— Não encontrado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.found_phones.best?.whatsapp ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700"
                          >
                            ✅
                          </Badge>
                        ) : result.found_phones.best ? (
                          <Badge variant="outline" className="text-gray-400">
                            ❌
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.applied ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700"
                          >
                            ✅ Aplicado
                          </Badge>
                        ) : result.status === "error" ? (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700"
                          >
                            Erro
                          </Badge>
                        ) : canApplyEmail || canApplyPhone ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplyResult(result)}
                            disabled={isApplying}
                          >
                            Aplicar
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Dados existentes
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={closeResultsAndRefresh}>
              Fechar
            </Button>
            <Button
              onClick={handleApplyAll}
              disabled={
                isApplying ||
                searchResults.filter(
                  (r) =>
                    !r.applied &&
                    r.status === "success" &&
                    ((r.found_email && !r.current_email) ||
                      (r.found_phones.best && !r.current_phone))
                ).length === 0
              }
              className="bg-altea-gold hover:bg-altea-gold/90 text-altea-navy"
            >
              {isApplying ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Aplicar Todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
