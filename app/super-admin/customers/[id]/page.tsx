"use client"

import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getCustomerDetails } from "@/app/actions/analyses-actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, User, Building2, CreditCard, Calendar, MapPin, Phone, Mail, FileDown } from 'lucide-react'

export default async function CustomerDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const result = await getCustomerDetails(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const { customer, profile, company, analysisHistory, isVMAX } = result.data

  const getScoreBadge = (score: number | null) => {
    if (!score) return <Badge variant="secondary">Sem Score</Badge>
    if (score >= 700) return <Badge className="bg-green-600">Excelente ({score})</Badge>
    if (score >= 500) return <Badge className="bg-yellow-600">Médio ({score})</Badge>
    return <Badge variant="destructive">Baixo ({score})</Badge>
  }

  const getSourceBadge = (source: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      assertiva: { variant: "default", label: "Análise de Crédito" },
      unknown: { variant: "outline", label: "Desconhecido" },
    }
    const config = variants[source] || variants.unknown
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/super-admin/analises">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          <p className="text-muted-foreground">Detalhes completos do cliente e análises de crédito</p>
        </div>
        {profile && (
          <Button
            variant="outline"
            onClick={async () => {
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
                    score: profile.score,
                    source: profile.source,
                    analysis_type: profile.analysis_type,
                    data: profile.data,
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
            }}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Extrair PDF
          </Button>
        )}
      </div>

      {/* Informações Básicas */}
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
                <p className="font-medium">{customer.name}</p>
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
              <Building2 className="h-5 w-5" />
              Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {company ? (
              <div className="grid grid-cols-2 gap-4">
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
      </div>

      {/* Score de Crédito Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Score de Crédito Atual
          </CardTitle>
          <CardDescription>Última análise realizada</CardDescription>
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
                {getSourceBadge(profile.source)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Tipo</p>
                <Badge variant="outline">{profile.analysis_type === "free" ? "Gratuita" : "Detalhada"}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Data</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>

              {profile.data && (
                <div className="col-span-4">
                  <p className="text-sm text-muted-foreground mb-2">Dados da API</p>
                  <div className="rounded-lg bg-muted p-4">
                    <pre className="text-xs overflow-auto">{JSON.stringify(profile.data, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhuma análise de crédito realizada ainda</p>
              <Button className="mt-4" asChild>
                <Link href="/super-admin/analises">Executar Análise</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Análises */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Análises</CardTitle>
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
                    <TableCell>{new Date(analysis.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{getScoreBadge(analysis.score)}</TableCell>
                    <TableCell>{getSourceBadge(analysis.source)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{analysis.analysis_type === "free" ? "Gratuita" : "Detalhada"}</Badge>
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
    </div>
  )
}
