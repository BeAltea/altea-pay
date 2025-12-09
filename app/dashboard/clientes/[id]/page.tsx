import { createServerClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import {
  ArrowLeft,
  TrendingUp,
  AlertCircle,
  Shield,
  Building2,
  DollarSign,
  AlertTriangle,
  FileText,
  Check,
  CreditCard,
} from "lucide-react"

export default async function ClienteDetalhesPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single()

  if (!profile?.company_id) {
    return <div className="p-8">Empresa não encontrada</div>
  }

  const { data: cliente } = await supabase.from("VMAX").select("*").eq("id", params.id).single()

  if (
    !cliente ||
    cliente.id_company?.toString().toLowerCase().trim() !== profile.company_id.toString().toLowerCase().trim()
  ) {
    notFound()
  }

  const assertiva_data = cliente.analysis_metadata || null

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análise de Crédito Completa</h1>
          <p className="text-muted-foreground">Dados completos da análise de crédito do cliente</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Score de Crédito */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <TrendingUp className="h-4 w-4" />
              SCORE DE CRÉDITO
            </CardTitle>
            <CardDescription>Análise de Crédito</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const creditoScore = assertiva_data?.credito?.resposta?.score?.pontos
                const displayScore = creditoScore === 0 ? 5 : creditoScore || cliente.credit_score || 0
                const scoreClass = assertiva_data?.credito?.resposta?.score?.classe || "N/A"
                const scoreFaixa = assertiva_data?.credito?.resposta?.score?.faixa?.titulo || "N/A"
                const scoreFaixaDescricao = assertiva_data?.credito?.resposta?.score?.faixa?.descricao || ""

                return (
                  <>
                    <div className="text-5xl font-bold text-purple-600 dark:text-purple-400">{displayScore}</div>
                    <p className="text-sm font-medium text-foreground">Classe {scoreClass}</p>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">{scoreFaixa}</p>
                    {scoreFaixaDescricao && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{scoreFaixaDescricao}</p>
                    )}
                  </>
                )
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Sanções CEIS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Sanções CEIS
            </CardTitle>
            <CardDescription>Empresas Inidôneas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-red-600 dark:text-red-400">
              {assertiva_data?.credito?.resposta?.ceis?.qtdOcorrencias || 0}
            </div>
          </CardContent>
        </Card>

        {/* Punições CNEP */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Punições CNEP
            </CardTitle>
            <CardDescription>Empresas Punidas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-orange-600 dark:text-orange-400">
              {assertiva_data?.credito?.resposta?.cnep?.qtdOcorrencias || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informações do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">NOME COMPLETO</p>
            <p className="font-medium text-foreground">{cliente.Cliente}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
            <p className="font-medium text-foreground">{cliente["CPF/CNPJ"]}</p>
          </div>
        </CardContent>
      </Card>

      {assertiva_data?.recupere?.resposta?.score && (
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <TrendingUp className="h-5 w-5" />
              Score Recupere
            </CardTitle>
            <CardDescription>Probabilidade de negociação e recuperação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-5xl font-bold text-purple-600 dark:text-purple-400">
                  {assertiva_data.recupere.resposta.score.pontos}
                </div>
                <p className="text-sm font-medium text-foreground mt-2">
                  Classe {assertiva_data.recupere.resposta.score.classe}
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-base px-4 py-2 bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700"
              >
                {assertiva_data.recupere.resposta.score.faixa?.titulo || "Índice de acordo"}
              </Badge>
            </div>
            {assertiva_data.recupere.resposta.score.faixa?.descricao && (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-foreground leading-relaxed">
                  {assertiva_data.recupere.resposta.score.faixa.descricao}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {assertiva_data?.credito?.resposta?.faturamentoEstimado !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Faturamento Estimado
            </CardTitle>
            <CardDescription>Estimativa de faturamento anual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {typeof assertiva_data.credito.resposta.faturamentoEstimado.valor === "number" &&
              assertiva_data.credito.resposta.faturamentoEstimado.valor > 0
                ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    assertiva_data.credito.resposta.faturamentoEstimado.valor,
                  )
                : "Não informado"}
            </div>
          </CardContent>
        </Card>
      )}

      {assertiva_data?.credito?.resposta?.rendaPresumida?.valor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Renda Presumida
            </CardTitle>
            <CardDescription>Estimativa de renda mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                assertiva_data.credito.resposta.rendaPresumida.valor,
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Faixa: {assertiva_data.credito.resposta.rendaPresumida.faixa || "N/A"}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Protestos Públicos
          </CardTitle>
          <CardDescription>Protestos registrados em cartório</CardDescription>
        </CardHeader>
        <CardContent>
          {assertiva_data?.acoes?.resposta?.protestos?.list &&
          assertiva_data.acoes.resposta.protestos.list.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total de Protestos:</span>
                <Badge variant="destructive" className="text-base">
                  {assertiva_data.acoes.resposta.protestos.qtdProtestos}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Valor Total:</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    assertiva_data.acoes.resposta.protestos.valorTotal,
                  )}
                </span>
              </div>
              <Separator />
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {assertiva_data.acoes.resposta.protestos.list.map((protesto: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">{protesto.cartorio}</p>
                        <p className="text-xs text-muted-foreground">
                          {protesto.cidade} - {protesto.uf}
                        </p>
                      </div>
                      <Badge variant="destructive" className="ml-2">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(protesto.valor)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Informação não disponível</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Últimas Consultas
          </CardTitle>
          <CardDescription>Empresas que consultaram este documento</CardDescription>
        </CardHeader>
        <CardContent>
          {assertiva_data?.credito?.resposta?.ultimasConsultas?.list &&
          assertiva_data.credito.resposta.ultimasConsultas.list.length > 0 ? (
            <div className="space-y-3">
              {assertiva_data.credito.resposta.ultimasConsultas.list.slice(0, 10).map((consulta: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{consulta.consultante}</p>
                    <p className="text-xs text-muted-foreground">{consulta.dataOcorrencia}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              <p className="text-sm font-medium">Nenhuma consulta recente registrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Débitos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assertiva_data?.credito?.resposta?.registrosDebitos?.list &&
          assertiva_data.credito.resposta.registrosDebitos.list.length > 0 ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-medium">
                  Total: {assertiva_data.credito.resposta.registrosDebitos.qtdDebitos} débito(s)
                </p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {typeof assertiva_data.credito.resposta.registrosDebitos.valorTotal === "number"
                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        assertiva_data.credito.resposta.registrosDebitos.valorTotal,
                      )
                    : "N/A"}
                </p>
              </div>
              {assertiva_data.credito.resposta.registrosDebitos.list.map((debito: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{debito.credor || "N/A"}</p>
                      <p className="text-sm text-muted-foreground">{debito.tipoDevedor?.titulo || ""}</p>
                    </div>
                    <Badge variant="destructive">
                      {typeof debito.valor === "number"
                        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(debito.valor)
                        : "N/A"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Vencimento</p>
                      <p className="text-foreground">{debito.dataVencimento || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cidade/UF</p>
                      <p className="text-foreground">
                        {debito.cidade || "N/A"}/{debito.uf || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum débito encontrado</p>
          )}
        </CardContent>
      </Card>

      {assertiva_data?.credito?.resposta?.chequesSemFundoCCF && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Cheques sem Fundo (CCF)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assertiva_data.credito.resposta.chequesSemFundoCCF.qtdOcorrencias > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Total: {assertiva_data.credito.resposta.chequesSemFundoCCF.qtdOcorrencias} ocorrência(s)
                  </p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {assertiva_data.credito.resposta.chequesSemFundoCCF.valorTotal || "N/A"}
                  </p>
                </div>
                {assertiva_data.credito.resposta.chequesSemFundoCCF.list?.map((cheque: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-2">
                    <p className="font-medium text-foreground">Banco: {cheque.banco || "N/A"}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Agência</p>
                        <p className="text-foreground">{cheque.agencia || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Data</p>
                        <p className="text-foreground">{cheque.data || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-green-600 dark:text-green-400">✓ Nenhum cheque sem fundo encontrado</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
