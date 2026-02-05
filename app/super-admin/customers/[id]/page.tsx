"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getCustomerDetails } from "@/app/actions/analyses-actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  User,
  Building2,
  CreditCard,
  Calendar,
  MapPin,
  Phone,
  Mail,
  FileDown,
  DollarSign,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react"

interface CustomerData {
  customer: {
    id: string
    name: string | null
    document: string | null
    company_id: string | null
    city: string | null
    email?: string | null
    phone?: string | null
    valorTotal: string | null
    quantidadeTitulos: string | null
    primeiraVencida: string | null
    maiorAtraso: string | null
    dias_inad: number
    creditScore: string | null
    riskLevel: string | null
    approvalStatus: string | null
    autoCollectionEnabled: boolean | null
    collectionProcessedAt: Date | null
    lastCollectionAttempt: Date | null
    lastAnalysisDate: Date | null
    analysisMetadata: any
    restrictive_analysis_logs: any
    restrictive_analysis_date: string | null
    behavioral_analysis_logs: any
    behavioral_analysis_date: string | null
    recovery_score: number | null
    recovery_class: string | null
    createdAt: Date
    updatedAt: Date
  }
  profile: any
  company: any
  analysisHistory: any[]
  isVMAX: boolean
}

export default function CustomerDetailsPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [data, setData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getCustomerDetails(id)
        if (!result.success || !result.data) {
          setError("Cliente não encontrado")
          return
        }
        setData(result.data as CustomerData)
      } catch (err) {
        setError("Erro ao carregar dados do cliente")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-gray-600">{error || "Cliente não encontrado"}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    )
  }

  const { customer, profile, company, analysisHistory, isVMAX } = data

  const getScoreBadge = (score: number | string | null) => {
    if (!score) return <Badge variant="secondary">Sem Score</Badge>
    const numScore = typeof score === "string" ? parseFloat(score) : score
    if (numScore >= 700) return <Badge className="bg-green-600">Excelente ({numScore})</Badge>
    if (numScore >= 500) return <Badge className="bg-yellow-600">Médio ({numScore})</Badge>
    return <Badge variant="destructive">Baixo ({numScore})</Badge>
  }

  const getSourceBadge = (source: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      assertiva: { variant: "default", label: "Análise Restritiva" },
      unknown: { variant: "outline", label: "Desconhecido" },
    }
    const config = variants[source] || variants.unknown
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getRiskBadge = (riskLevel: string | null) => {
    if (!riskLevel) return <Badge variant="outline">N/A</Badge>
    const level = riskLevel.toLowerCase()
    if (level === "alto" || level === "high") {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Alto</Badge>
    }
    if (level === "medio" || level === "medium") {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Médio</Badge>
    }
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Baixo</Badge>
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Pendente</Badge>
    const s = status.toUpperCase()
    if (s === "ACEITA" || s === "APPROVED") {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Aprovado</Badge>
    }
    if (s === "REJEITA" || s === "REJECTED") {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Rejeitado</Badge>
    }
    return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">Pendente</Badge>
  }

  const getAtrasoBadge = (maiorAtraso: string | null) => {
    if (!maiorAtraso || maiorAtraso === "0") {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Em dia</Badge>
    }
    const dias = parseInt(maiorAtraso)
    if (isNaN(dias)) {
      return <Badge variant="outline">{maiorAtraso}</Badge>
    }
    if (dias > 90) {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {dias} dias em atraso
        </Badge>
      )
    }
    if (dias > 30) {
      return (
        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
          {dias} dias em atraso
        </Badge>
      )
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
        {dias} dias em atraso
      </Badge>
    )
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString("pt-BR")
  }

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleString("pt-BR")
  }

  const handleExportPDF = async () => {
    try {
      const response = await fetch("/api/export-analysis-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: customer.name,
            document: customer.document,
            city: customer.city,
            email: customer.email,
            phone: customer.phone,
          },
          score: profile?.score,
          source: profile?.source,
          analysis_type: profile?.analysis_type,
          data: profile?.data,
        }),
      })

      if (!response.ok) throw new Error("Erro ao gerar PDF")

      const html = await response.text()
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => printWindow.print(), 250)
      }
    } catch (error) {
      console.error("Erro ao exportar PDF:", error)
      alert("Erro ao gerar PDF. Tente novamente.")
    }
  }

  return (
    <div className="space-y-6 p-3 sm:p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold">{customer.name || "Cliente"}</h1>
          <p className="text-muted-foreground">Detalhes completos do cliente</p>
        </div>
        {profile && (
          <Button variant="outline" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            Extrair PDF
          </Button>
        )}
      </div>

      {/* Informações Básicas e Financeiras */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{customer.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                <p className="font-medium">{customer.document || "N/A"}</p>
              </div>
              {customer.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </p>
                </div>
              )}
              {customer.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </p>
                </div>
              )}
              {customer.city && (
                <div>
                  <p className="text-sm text-muted-foreground">Cidade</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {customer.city}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Origem</p>
                <Badge variant={isVMAX ? "default" : "secondary"}>{isVMAX ? "VMAX" : "Sistema"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Informações Financeiras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="font-medium text-lg">{customer.valorTotal || "R$ 0,00"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quantidade de Títulos</p>
                <p className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {customer.quantidadeTitulos || "0"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Primeira Vencida</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {customer.primeiraVencida || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maior Atraso</p>
                {getAtrasoBadge(customer.maiorAtraso)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status e Risco */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Score de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Score</p>
                {getScoreBadge(customer.creditScore)}
              </div>
              {customer.recovery_score && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Recovery Score</p>
                  <p className="font-medium">{customer.recovery_score}</p>
                </div>
              )}
              {customer.recovery_class && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Recovery Class</p>
                  <Badge variant="outline">{customer.recovery_class}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Nível de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Risco</p>
                {getRiskBadge(customer.riskLevel)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status de Aprovação</p>
                {getStatusBadge(customer.approvalStatus)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Cobrança Automática
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                {customer.autoCollectionEnabled ? (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ativada
                  </Badge>
                ) : (
                  <Badge variant="outline">Desativada</Badge>
                )}
              </div>
              {customer.collectionProcessedAt && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Processado em</p>
                  <p className="text-sm">{formatDateTime(customer.collectionProcessedAt)}</p>
                </div>
              )}
              {customer.lastCollectionAttempt && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Última Tentativa</p>
                  <p className="text-sm">{formatDateTime(customer.lastCollectionAttempt)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {company ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{company.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CNPJ</p>
                <p className="font-medium">{company.cnpj || "N/A"}</p>
              </div>
              {company.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{company.email}</p>
                </div>
              )}
              {company.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{company.phone}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Empresa não encontrada</p>
          )}
        </CardContent>
      </Card>

      {/* Análise Restritiva Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Análise Restritiva Atual
          </CardTitle>
          <CardDescription>Última análise restritiva realizada</CardDescription>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="grid gap-6 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Score</p>
                {getScoreBadge(profile.score)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Fonte</p>
                {getSourceBadge(profile.provider || profile.source || "unknown")}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Tipo</p>
                <Badge variant="outline">
                  {profile.analysisType === "free" || profile.analysis_type === "free" ? "Gratuita" : "Detalhada"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Data</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(profile.createdAt || profile.created_at)}
                </p>
              </div>

              {profile.data && (
                <div className="col-span-4">
                  <p className="text-sm text-muted-foreground mb-2">Dados da API</p>
                  <div className="rounded-lg bg-muted p-4 max-h-96 overflow-auto">
                    <pre className="text-xs">{JSON.stringify(profile.data, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : customer.restrictive_analysis_logs ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Data da Análise</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {customer.restrictive_analysis_date
                      ? formatDate(customer.restrictive_analysis_date)
                      : formatDate(customer.lastAnalysisDate)}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Dados da Análise</p>
                <div className="rounded-lg bg-muted p-4 max-h-96 overflow-auto">
                  <pre className="text-xs">{JSON.stringify(customer.restrictive_analysis_logs, null, 2)}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma análise restritiva realizada ainda</p>
              <Button className="mt-4" asChild>
                <Link href="/super-admin/analises">Executar Análise</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análise Comportamental (se existir) */}
      {customer.behavioral_analysis_logs && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Análise Comportamental
            </CardTitle>
            <CardDescription>
              {customer.behavioral_analysis_date
                ? `Realizada em ${formatDate(customer.behavioral_analysis_date)}`
                : "Dados da análise comportamental"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted p-4 max-h-96 overflow-auto">
              <pre className="text-xs">{JSON.stringify(customer.behavioral_analysis_logs, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Análises */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Análises
          </CardTitle>
          <CardDescription>Todas as análises de crédito realizadas para este cliente</CardDescription>
        </CardHeader>
        <CardContent>
          {analysisHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisHistory.map((analysis) => (
                  <TableRow key={analysis.id}>
                    <TableCell>{formatDate(analysis.createdAt || analysis.created_at)}</TableCell>
                    <TableCell>{getScoreBadge(analysis.score)}</TableCell>
                    <TableCell>{getSourceBadge(analysis.provider || analysis.source || "unknown")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {analysis.analysisType === "free" || analysis.analysis_type === "free"
                          ? "Gratuita"
                          : "Detalhada"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={analysis.status === "completed" ? "default" : "secondary"}>
                        {analysis.status === "completed" ? "Concluída" : "Pendente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum histórico de análise disponível</p>
          )}
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Informações do Registro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Criado em</p>
              <p className="font-medium">{formatDateTime(customer.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Atualizado em</p>
              <p className="font-medium">{formatDateTime(customer.updatedAt)}</p>
            </div>
            {customer.lastAnalysisDate && (
              <div>
                <p className="text-sm text-muted-foreground">Última Análise</p>
                <p className="font-medium">{formatDateTime(customer.lastAnalysisDate)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
