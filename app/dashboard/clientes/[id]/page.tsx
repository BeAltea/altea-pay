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
  Handshake,
  Trash2,
} from "lucide-react"
import { ExportCustomerPDFButton } from "@/components/dashboard/export-customer-pdf-button"
import { deleteCustomer } from "@/app/actions/delete-customer"
import { toast } from "sonner"

export const dynamic = "force-dynamic"

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

  const handleDelete = async () => {
    "use server"
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect("/auth/signin")

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

    if (!profile?.company_id) redirect("/dashboard")

    const result = await deleteCustomer(params.id, profile.company_id)

    if (result.success) {
      redirect("/dashboard/clientes")
    } else {
      toast.error("Erro ao excluir cliente")
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/dashboard/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0 w-full">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words">
            Análise Restritiva Completa
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
            Dados completos da análise restritiva do cliente
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="default" size="sm">
            <Link href={`/dashboard/clientes/${cliente.id}/negotiate`}>
              <Handshake className="h-4 w-4 mr-2" />
              Negociar
            </Link>
          </Button>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </form>
          <ExportCustomerPDFButton customerId={cliente.id} customerName={cliente.Cliente} />
        </div>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
        {/* Score de Crédito */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">SCORE DE CRÉDITO</span>
            </CardTitle>
            <CardDescription className="text-xs truncate">Análise Restritiva</CardDescription>
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
                    <div className="text-4xl sm:text-5xl font-bold text-purple-600 dark:text-purple-400">
                      {displayScore}
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">Classe {scoreClass}</p>
                    <p className="text-xs sm:text-sm font-medium text-purple-600 dark:text-purple-400 break-words">
                      {scoreFaixa}
                    </p>
                    {scoreFaixaDescricao && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed break-words">
                        {scoreFaixaDescricao}
                      </p>
                    )}
                  </>
                )
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Sanções CEIS */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Sanções CEIS</span>
            </CardTitle>
            <CardDescription className="text-xs truncate">Empresas Inidôneas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl sm:text-5xl font-bold text-red-600 dark:text-red-400">
              {assertiva_data?.credito?.resposta?.ceis?.qtdOcorrencias || 0}
            </div>
          </CardContent>
        </Card>

        {/* Punições CNEP */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Punições CNEP</span>
            </CardTitle>
            <CardDescription className="text-xs truncate">Empresas Punidas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl sm:text-5xl font-bold text-orange-600 dark:text-orange-400">
              {assertiva_data?.credito?.resposta?.cnep?.qtdOcorrencias || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">Informações do Cliente</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">NOME COMPLETO</p>
            <p className="text-sm sm:text-base font-medium text-foreground break-words">{cliente.Cliente}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">CPF/CNPJ</p>
            <p className="text-sm sm:text-base font-medium text-foreground break-words">{cliente["CPF/CNPJ"]}</p>
          </div>
        </CardContent>
      </Card>

      {assertiva_data?.recupere?.resposta?.score && (
        <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="truncate">Score Recupere</span>
            </CardTitle>
            <CardDescription className="text-xs truncate">Probabilidade de negociação e recuperação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex-1">
                <div className="text-4xl sm:text-5xl font-bold text-purple-600 dark:text-purple-400">
                  {assertiva_data.recupere.resposta.score.pontos}
                </div>
                <p className="text-xs sm:text-sm font-medium text-foreground mt-2">
                  Classe {assertiva_data.recupere.resposta.score.classe}
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-xs sm:text-base px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700 shrink-0"
              >
                {assertiva_data.recupere.resposta.score.faixa?.titulo || "Índice de acordo"}
              </Badge>
            </div>
            {assertiva_data.recupere.resposta.score.faixa?.descricao && (
              <div className="bg-white dark:bg-gray-900 rounded-lg p-3 sm:p-4 border border-purple-200 dark:border-purple-800">
                <p className="text-xs sm:text-sm text-foreground leading-relaxed break-words">
                  {assertiva_data.recupere.resposta.score.faixa.descricao}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {assertiva_data?.credito?.resposta?.faturamentoEstimado !== undefined && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="truncate">Faturamento Estimado</span>
            </CardTitle>
            <CardDescription className="text-xs truncate">Estimativa de faturamento anual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 break-words">
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
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="truncate">Renda Presumida</span>
            </CardTitle>
            <CardDescription className="text-xs truncate">Estimativa de renda mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 break-words">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                assertiva_data.credito.resposta.rendaPresumida.valor,
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2 break-words">
              Faixa: {assertiva_data.credito.resposta.rendaPresumida.faixa || "N/A"}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">Protestos Públicos</span>
          </CardTitle>
          <CardDescription className="text-xs truncate">Protestos registrados em cartório</CardDescription>
        </CardHeader>
        <CardContent>
          {assertiva_data?.acoes?.resposta?.protestos?.list &&
          assertiva_data.acoes.resposta.protestos.list.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-medium">Total de Protestos:</span>
                <Badge variant="destructive" className="text-sm sm:text-base">
                  {assertiva_data.acoes.resposta.protestos.qtdProtestos}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-medium">Valor Total:</span>
                <span className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400 break-words">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                    assertiva_data.acoes.resposta.protestos.valorTotal,
                  )}
                </span>
              </div>
              <Separator />
              <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto">
                {assertiva_data.acoes.resposta.protestos.list.map((protesto: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm break-words">{protesto.cartorio}</p>
                        <p className="text-xs text-muted-foreground break-words">
                          {protesto.cidade} - {protesto.uf}
                        </p>
                      </div>
                      <Badge variant="destructive" className="shrink-0 text-xs">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(protesto.valor)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground">Informação não disponível</p>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">Últimas Consultas</span>
          </CardTitle>
          <CardDescription className="text-xs truncate">Histórico de consultas realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          {assertiva_data?.credito?.resposta?.ultimasConsultas?.list &&
          assertiva_data.credito.resposta.ultimasConsultas.list.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {assertiva_data.credito.resposta.ultimasConsultas.list.slice(0, 10).map((consulta: any, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 border-b pb-2 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium">{consulta.dataOcorrencia}</p>
                    <p className="text-xs text-muted-foreground">Consulta realizada</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
              <p className="text-xs sm:text-sm font-medium">Nenhuma consulta recente registrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">Débitos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assertiva_data?.credito?.resposta?.registrosDebitos?.list &&
          assertiva_data.credito.resposta.registrosDebitos.list.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm font-medium">
                  Total: {assertiva_data.credito.resposta.registrosDebitos.qtdDebitos} débito(s)
                </p>
                <p className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400 break-words">
                  {typeof assertiva_data.credito.resposta.registrosDebitos.valorTotal === "number"
                    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        assertiva_data.credito.resposta.registrosDebitos.valorTotal,
                      )
                    : "N/A"}
                </p>
              </div>
              {assertiva_data.credito.resposta.registrosDebitos.list.map((debito: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-3 sm:p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm text-foreground break-words">
                        {debito.credor || "N/A"}
                      </p>
                      <p className="text-xs text-muted-foreground break-words">{debito.tipoDevedor?.titulo || ""}</p>
                    </div>
                    <Badge variant="destructive" className="shrink-0 text-xs">
                      {typeof debito.valor === "number"
                        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(debito.valor)
                        : "N/A"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div>
                      <p className="text-muted-foreground">Vencimento</p>
                      <p className="text-foreground break-words">{debito.dataVencimento || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cidade/UF</p>
                      <p className="text-foreground break-words">
                        {debito.cidade || "N/A"}/{debito.uf || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground">Nenhum débito encontrado</p>
          )}
        </CardContent>
      </Card>

      {assertiva_data?.credito?.resposta?.chequesSemFundoCCF && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="truncate">Cheques sem Fundo (CCF)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assertiva_data.credito.resposta.chequesSemFundoCCF.qtdOcorrencias > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm font-medium">
                    Total: {assertiva_data.credito.resposta.chequesSemFundoCCF.qtdOcorrencias} ocorrência(s)
                  </p>
                  <p className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400 break-words">
                    {assertiva_data.credito.resposta.chequesSemFundoCCF.valorTotal || "N/A"}
                  </p>
                </div>
                {assertiva_data.credito.resposta.chequesSemFundoCCF.list?.map((cheque: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-3 sm:p-4 space-y-2">
                    <p className="font-medium text-xs sm:text-sm text-foreground break-words">
                      Banco: {cheque.banco || "N/A"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div>
                        <p className="text-muted-foreground">Agência</p>
                        <p className="text-foreground break-words">{cheque.agencia || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Data</p>
                        <p className="text-foreground break-words">{cheque.data || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                ✓ Nenhum cheque sem fundo encontrado
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
