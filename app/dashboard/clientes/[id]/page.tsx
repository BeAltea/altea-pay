import { createServerClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  TrendingUp,
  AlertCircle,
  Shield,
  Building2,
  DollarSign,
  AlertTriangle,
  CreditCard,
  Handshake,
  Trash2,
} from "lucide-react"
import { ExportCustomerPDFButton } from "@/components/dashboard/export-customer-pdf-button"
import { deleteCustomer } from "@/app/actions/delete-customer"

export const dynamic = "force-dynamic"

export default async function ClienteDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { data: cliente } = await supabase.from("VMAX").select("*").eq("id", id).single()

  if (
    !cliente ||
    cliente.id_company?.toString().toLowerCase().trim() !== profile.company_id.toString().toLowerCase().trim()
  ) {
    notFound()
  }

  const assertiva_data = cliente.analysis_metadata || null

  const cleanCpfCnpj = cliente["CPF/CNPJ"]?.replace(/\D/g, "")
  const { data: behavioralAnalysis } = await supabase
    .from("credit_profiles")
    .select("*")
    .eq("cpf", cleanCpfCnpj)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()



  const behavioralData = behavioralAnalysis?.data || behavioralAnalysis?.data_assertiva || null

  const handleDelete = async () => {
    "use server"
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect("/auth/signin")

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

    if (!profile?.company_id) redirect("/dashboard")

    const result = await deleteCustomer(id, profile.company_id)

    if (result.success) {
      redirect("/dashboard/clientes")
    } else {
      toast.error("Erro ao excluir cliente")
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Link
          href="/dashboard/clientes"
          className="shrink-0 p-2 rounded-lg transition-colors hover:bg-[var(--admin-bg-tertiary)]"
          style={{ color: "var(--admin-text-secondary)" }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0 w-full">
          <h1
            className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words"
            style={{ color: "var(--admin-text-primary)" }}
          >
            Analise Restritiva Completa
          </h1>
          <p
            className="text-xs sm:text-sm mt-1 break-words"
            style={{ color: "var(--admin-text-secondary)" }}
          >
            Dados completos da analise restritiva do cliente
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/clientes/${cliente.id}/negotiate`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--admin-green)", color: "#fff" }}
          >
            <Handshake className="h-4 w-4" />
            Negociar
          </Link>
          <form action={handleDelete}>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "rgba(240, 104, 104, 0.15)", color: "var(--admin-red)", border: "1px solid rgba(240, 104, 104, 0.3)" }}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </button>
          </form>
          <ExportCustomerPDFButton customerId={cliente.id} customerName={cliente.Cliente} />
        </div>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full">
        {/* Score de Crédito */}
        <div
          className="rounded-xl overflow-hidden p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="pb-3">
            <div
              className="text-xs sm:text-sm font-medium flex items-center gap-2"
              style={{ color: "var(--admin-purple)" }}
            >
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">SCORE DE CREDITO</span>
            </div>
            <div className="text-xs truncate" style={{ color: "var(--admin-text-muted)" }}>
              Analise Restritiva
            </div>
          </div>
          <div className="space-y-2">
            {(() => {
              const creditoScore = assertiva_data?.credito?.resposta?.score?.pontos
              const displayScore = creditoScore === 0 ? 5 : creditoScore || cliente.credit_score || 0
              const scoreClass = assertiva_data?.credito?.resposta?.score?.classe || "N/A"
              const scoreFaixa = assertiva_data?.credito?.resposta?.score?.faixa?.titulo || "N/A"
              const scoreFaixaDescricao = assertiva_data?.credito?.resposta?.score?.faixa?.descricao || ""

              return (
                <>
                  <div className="text-4xl sm:text-5xl font-bold" style={{ color: "var(--admin-purple)" }}>
                    {displayScore}
                  </div>
                  <p className="text-xs sm:text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
                    Classe {scoreClass}
                  </p>
                  <p
                    className="text-xs sm:text-sm font-medium break-words"
                    style={{ color: "var(--admin-purple)" }}
                  >
                    {scoreFaixa}
                  </p>
                  {scoreFaixaDescricao && (
                    <p
                      className="text-xs mt-2 leading-relaxed break-words"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      {scoreFaixaDescricao}
                    </p>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        {/* Sanções CEIS */}
        <div
          className="rounded-xl overflow-hidden p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="pb-3">
            <div
              className="text-xs sm:text-sm font-medium flex items-center gap-2"
              style={{ color: "var(--admin-text-primary)" }}
            >
              <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" style={{ color: "var(--admin-red)" }} />
              <span className="truncate">Sancoes CEIS</span>
            </div>
            <div className="text-xs truncate" style={{ color: "var(--admin-text-muted)" }}>
              Empresas Inidoneas
            </div>
          </div>
          <div className="text-4xl sm:text-5xl font-bold" style={{ color: "var(--admin-red)" }}>
            {assertiva_data?.credito?.resposta?.ceis?.qtdOcorrencias || 0}
          </div>
        </div>

        {/* Punições CNEP */}
        <div
          className="rounded-xl overflow-hidden p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="pb-3">
            <div
              className="text-xs sm:text-sm font-medium flex items-center gap-2"
              style={{ color: "var(--admin-text-primary)" }}
            >
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" style={{ color: "var(--admin-orange)" }} />
              <span className="truncate">Punicoes CNEP</span>
            </div>
            <div className="text-xs truncate" style={{ color: "var(--admin-text-muted)" }}>
              Empresas Punidas
            </div>
          </div>
          <div className="text-4xl sm:text-5xl font-bold" style={{ color: "var(--admin-orange)" }}>
            {assertiva_data?.credito?.resposta?.cnep?.qtdOcorrencias || 0}
          </div>
        </div>
      </div>

      {(() => {
        const creditScore = behavioralData?.credito?.resposta?.score
        const recoveryScore = behavioralData?.recupere?.resposta?.score

        if (!creditScore && !recoveryScore) return null

        return (
          <div
            className="rounded-xl overflow-hidden p-4"
            style={{
              background: "var(--admin-bg-secondary)",
              border: "1px solid var(--admin-gold-400)",
            }}
          >
            <div className="pb-3">
              <div className="flex items-center justify-between">
                <div
                  className="text-xl sm:text-2xl font-bold flex items-center gap-2"
                  style={{ color: "var(--admin-gold-400)" }}
                >
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
                  <span className="truncate">Analise Comportamental</span>
                </div>
                {(behavioralAnalysis?.updated_at || behavioralAnalysis?.created_at) && (
                  <span
                    className="px-2 py-1 rounded-md text-xs font-medium"
                    style={{ background: "var(--admin-gold-bg)", color: "var(--admin-gold-400)" }}
                  >
                    {new Date(behavioralAnalysis.updated_at || behavioralAnalysis.created_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm" style={{ color: "var(--admin-text-secondary)" }}>
                Dados consolidados da analise comportamental do cliente
              </p>
            </div>
            <div className="space-y-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {/* Score de Crédito Comportamental */}
                {creditScore && (
                  <div
                    className="p-4 rounded-lg"
                    style={{ background: "var(--admin-blue-bg)", border: "1px solid var(--admin-border)" }}
                  >
                    <p className="text-xs sm:text-sm mb-2" style={{ color: "var(--admin-text-muted)" }}>
                      Score de Credito
                    </p>
                    <div className="flex items-end gap-3">
                      <div className="text-3xl sm:text-4xl font-bold" style={{ color: "var(--admin-blue)" }}>
                        {creditScore.pontos}
                      </div>
                      <span
                        className="mb-1 px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-blue)" }}
                      >
                        Classe {creditScore.classe}
                      </span>
                    </div>
                    {creditScore.faixa?.titulo && (
                      <p className="text-xs mt-2 font-medium" style={{ color: "var(--admin-blue)" }}>
                        {creditScore.faixa.titulo}
                      </p>
                    )}
                    {creditScore.faixa?.descricao && (
                      <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
                        {creditScore.faixa.descricao}
                      </p>
                    )}
                  </div>
                )}

                {/* Score de Recuperação Comportamental */}
                {recoveryScore && (
                  <div
                    className="p-4 rounded-lg"
                    style={{ background: "var(--admin-orange-bg)", border: "1px solid var(--admin-border)" }}
                  >
                    <p className="text-xs sm:text-sm mb-2" style={{ color: "var(--admin-text-muted)" }}>
                      Score de Recuperacao
                    </p>
                    <div className="flex items-end gap-3">
                      <div className="text-3xl sm:text-4xl font-bold" style={{ color: "var(--admin-orange)" }}>
                        {recoveryScore.pontos}
                      </div>
                      <span
                        className="mb-1 px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-orange)" }}
                      >
                        Classe {recoveryScore.classe}
                      </span>
                    </div>
                    {recoveryScore.faixa?.titulo && (
                      <p className="text-xs mt-2 font-medium" style={{ color: "var(--admin-orange)" }}>
                        {recoveryScore.faixa.titulo}
                      </p>
                    )}
                    {recoveryScore.faixa?.descricao && (
                      <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--admin-text-muted)" }}>
                        {recoveryScore.faixa.descricao}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Protestos da Análise Comportamental */}
              {behavioralData?.acoes?.resposta?.protestos && (
                <div
                  className="p-4 rounded-lg"
                  style={{ background: "var(--admin-bg-tertiary)", border: "1px solid var(--admin-border)" }}
                >
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <AlertTriangle className="h-4 w-4" style={{ color: "var(--admin-red)" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                      Protestos
                    </p>
                  </div>
                  <div className="grid gap-2 grid-cols-2">
                    <div>
                      <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                        Quantidade
                      </p>
                      <p className="text-lg font-bold" style={{ color: "var(--admin-red)" }}>
                        {behavioralData.acoes.resposta.protestos.qtdProtestos || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                        Valor Total
                      </p>
                      <p className="text-lg font-bold" style={{ color: "var(--admin-red)" }}>
                        {behavioralData.acoes.resposta.protestos.valorTotal
                          ? new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(behavioralData.acoes.resposta.protestos.valorTotal)
                          : "R$ 0,00"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Faturamento Estimado da Análise Comportamental */}
              {behavioralData?.credito?.resposta?.faturamentoEstimado?.valor && (
                <div
                  className="p-4 rounded-lg"
                  style={{ background: "var(--admin-green-bg)", border: "1px solid var(--admin-border)" }}
                >
                  <p className="text-xs sm:text-sm mb-2" style={{ color: "var(--admin-text-muted)" }}>
                    Faturamento Estimado
                  </p>
                  <div className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--admin-green)" }}>
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(behavioralData.credito.resposta.faturamentoEstimado.valor)}
                  </div>
                  {behavioralData.credito.resposta.faturamentoEstimado.faixa && (
                    <p className="text-xs mt-2" style={{ color: "var(--admin-text-muted)" }}>
                      Faixa: {behavioralData.credito.resposta.faturamentoEstimado.faixa}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <div
        className="rounded-xl overflow-hidden p-4"
        style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
      >
        <div className="pb-3">
          <div
            className="text-base sm:text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--admin-text-primary)" }}
          >
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" style={{ color: "var(--admin-blue)" }} />
            <span className="truncate">Informacoes do Cliente</span>
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm mb-1" style={{ color: "var(--admin-text-muted)" }}>
              NOME COMPLETO
            </p>
            <p
              className="text-sm sm:text-base font-medium break-words"
              style={{ color: "var(--admin-text-primary)" }}
            >
              {cliente.Cliente}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm mb-1" style={{ color: "var(--admin-text-muted)" }}>
              CPF/CNPJ
            </p>
            <p
              className="text-sm sm:text-base font-medium break-words"
              style={{ color: "var(--admin-text-primary)" }}
            >
              {cliente["CPF/CNPJ"]}
            </p>
          </div>
        </div>
      </div>

      {assertiva_data?.recupere?.resposta?.score && (
        <div
          className="rounded-xl overflow-hidden p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-purple)" }}
        >
          <div className="pb-3">
            <div
              className="text-base sm:text-lg font-semibold flex items-center gap-2"
              style={{ color: "var(--admin-purple)" }}
            >
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="truncate">Score Recupere</span>
            </div>
            <p className="text-xs truncate" style={{ color: "var(--admin-text-muted)" }}>
              Probabilidade de negociacao e recuperacao
            </p>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex-1">
                <div className="text-4xl sm:text-5xl font-bold" style={{ color: "var(--admin-purple)" }}>
                  {assertiva_data.recupere.resposta.score.pontos}
                </div>
                <p className="text-xs sm:text-sm font-medium mt-2" style={{ color: "var(--admin-text-primary)" }}>
                  Classe {assertiva_data.recupere.resposta.score.classe}
                </p>
              </div>
              <span
                className="text-xs sm:text-base px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shrink-0"
                style={{ background: "var(--admin-purple-bg)", color: "var(--admin-purple)", border: "1px solid var(--admin-border)" }}
              >
                {assertiva_data.recupere.resposta.score.faixa?.titulo || "Indice de acordo"}
              </span>
            </div>
            {assertiva_data.recupere.resposta.score.faixa?.descricao && (
              <div
                className="rounded-lg p-3 sm:p-4"
                style={{ background: "var(--admin-bg-tertiary)", border: "1px solid var(--admin-border)" }}
              >
                <p
                  className="text-xs sm:text-sm leading-relaxed break-words"
                  style={{ color: "var(--admin-text-primary)" }}
                >
                  {assertiva_data.recupere.resposta.score.faixa.descricao}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {assertiva_data?.credito?.resposta?.faturamentoEstimado !== undefined && (
        <div
          className="rounded-xl overflow-hidden p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="pb-3">
            <div
              className="text-base sm:text-lg font-semibold flex items-center gap-2"
              style={{ color: "var(--admin-text-primary)" }}
            >
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" style={{ color: "var(--admin-green)" }} />
              <span className="truncate">Faturamento Estimado</span>
            </div>
            <p className="text-xs truncate" style={{ color: "var(--admin-text-muted)" }}>
              Estimativa de faturamento anual
            </p>
          </div>
          <div className="text-2xl sm:text-3xl font-bold break-words" style={{ color: "var(--admin-green)" }}>
            {typeof assertiva_data.credito.resposta.faturamentoEstimado.valor === "number" &&
            assertiva_data.credito.resposta.faturamentoEstimado.valor > 0
              ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  assertiva_data.credito.resposta.faturamentoEstimado.valor,
                )
              : "Nao informado"}
          </div>
        </div>
      )}

      {assertiva_data?.credito?.resposta?.rendaPresumida?.valor && (
        <div
          className="rounded-xl overflow-hidden p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="pb-3">
            <div
              className="text-base sm:text-lg font-semibold flex items-center gap-2"
              style={{ color: "var(--admin-text-primary)" }}
            >
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" style={{ color: "var(--admin-green)" }} />
              <span className="truncate">Renda Presumida</span>
            </div>
            <p className="text-xs truncate" style={{ color: "var(--admin-text-muted)" }}>
              Estimativa de renda mensal
            </p>
          </div>
          <div className="text-2xl sm:text-3xl font-bold break-words" style={{ color: "var(--admin-green)" }}>
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
              assertiva_data.credito.resposta.rendaPresumida.valor,
            )}
          </div>
          <p className="text-xs sm:text-sm mt-2 break-words" style={{ color: "var(--admin-text-muted)" }}>
            Faixa: {assertiva_data.credito.resposta.rendaPresumida.faixa || "N/A"}
          </p>
        </div>
      )}

      <div
        className="rounded-xl overflow-hidden p-4"
        style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
      >
        <div className="pb-3">
          <div
            className="text-base sm:text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--admin-text-primary)" }}
          >
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" style={{ color: "var(--admin-red)" }} />
            <span className="truncate">Protestos Publicos</span>
          </div>
          <p className="text-xs truncate" style={{ color: "var(--admin-text-muted)" }}>
            Protestos registrados em cartorio
          </p>
        </div>
        {assertiva_data?.acoes?.resposta?.protestos?.list &&
        assertiva_data.acoes.resposta.protestos.list.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <span className="text-xs sm:text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
                Total de Protestos:
              </span>
              <span
                className="px-2 py-1 rounded-md text-sm sm:text-base font-medium"
                style={{ background: "var(--admin-red-bg)", color: "var(--admin-red)" }}
              >
                {assertiva_data.acoes.resposta.protestos.qtdProtestos}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <span className="text-xs sm:text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
                Valor Total:
              </span>
              <span className="text-base sm:text-lg font-bold break-words" style={{ color: "var(--admin-red)" }}>
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  assertiva_data.acoes.resposta.protestos.valorTotal,
                )}
              </span>
            </div>
            <div style={{ borderTop: "1px solid var(--admin-border)" }} />
            <div className="space-y-2 sm:space-y-3 max-h-64 overflow-y-auto">
              {assertiva_data.acoes.resposta.protestos.list.map((protesto: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg"
                  style={{ background: "var(--admin-red-bg)", border: "1px solid var(--admin-border)" }}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm break-words" style={{ color: "var(--admin-text-primary)" }}>
                        {protesto.cartorio}
                      </p>
                      <p className="text-xs break-words" style={{ color: "var(--admin-text-muted)" }}>
                        {protesto.cidade} - {protesto.uf}
                      </p>
                    </div>
                    <span
                      className="shrink-0 text-xs px-2 py-1 rounded-md font-medium"
                      style={{ background: "var(--admin-bg-tertiary)", color: "var(--admin-red)" }}
                    >
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(protesto.valor)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs sm:text-sm" style={{ color: "var(--admin-text-muted)" }}>
            Informacao nao disponivel
          </p>
        )}
      </div>

      <div
        className="rounded-xl overflow-hidden p-4"
        style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
      >
        <div className="pb-3">
          <div
            className="text-base sm:text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--admin-text-primary)" }}
          >
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" style={{ color: "var(--admin-red)" }} />
            <span className="truncate">Debitos</span>
          </div>
        </div>
        {assertiva_data?.credito?.resposta?.registrosDebitos?.list &&
        assertiva_data.credito.resposta.registrosDebitos.list.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
                Total: {assertiva_data.credito.resposta.registrosDebitos.qtdDebitos} debito(s)
              </p>
              <p className="text-base sm:text-lg font-bold break-words" style={{ color: "var(--admin-red)" }}>
                {typeof assertiva_data.credito.resposta.registrosDebitos.valorTotal === "number"
                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      assertiva_data.credito.resposta.registrosDebitos.valorTotal,
                    )
                  : "N/A"}
              </p>
            </div>
            {assertiva_data.credito.resposta.registrosDebitos.list.map((debito: any, idx: number) => (
              <div
                key={idx}
                className="rounded-lg p-3 sm:p-4 space-y-2"
                style={{ background: "var(--admin-bg-tertiary)", border: "1px solid var(--admin-border)" }}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs sm:text-sm break-words" style={{ color: "var(--admin-text-primary)" }}>
                      {debito.credor || "N/A"}
                    </p>
                    <p className="text-xs break-words" style={{ color: "var(--admin-text-muted)" }}>
                      {debito.tipoDevedor?.titulo || ""}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-xs px-2 py-1 rounded-md font-medium"
                    style={{ background: "var(--admin-red-bg)", color: "var(--admin-red)" }}
                  >
                    {typeof debito.valor === "number"
                      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(debito.valor)
                      : "N/A"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                  <div>
                    <p style={{ color: "var(--admin-text-muted)" }}>Vencimento</p>
                    <p style={{ color: "var(--admin-text-primary)" }} className="break-words">{debito.dataVencimento || "N/A"}</p>
                  </div>
                  <div>
                    <p style={{ color: "var(--admin-text-muted)" }}>Cidade/UF</p>
                    <p style={{ color: "var(--admin-text-primary)" }} className="break-words">
                      {debito.cidade || "N/A"}/{debito.uf || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs sm:text-sm" style={{ color: "var(--admin-text-muted)" }}>Nenhum debito encontrado</p>
        )}
      </div>

      {assertiva_data?.credito?.resposta?.chequesSemFundoCCF && (
        <div
          className="rounded-xl overflow-hidden p-4"
          style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
        >
          <div className="pb-3">
            <div
              className="text-base sm:text-lg font-semibold flex items-center gap-2"
              style={{ color: "var(--admin-text-primary)" }}
            >
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" style={{ color: "var(--admin-orange)" }} />
              <span className="truncate">Cheques sem Fundo (CCF)</span>
            </div>
          </div>
          {assertiva_data.credito.resposta.chequesSemFundoCCF.qtdOcorrencias > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
                  Total: {assertiva_data.credito.resposta.chequesSemFundoCCF.qtdOcorrencias} ocorrencia(s)
                </p>
                <p className="text-base sm:text-lg font-bold break-words" style={{ color: "var(--admin-red)" }}>
                  {assertiva_data.credito.resposta.chequesSemFundoCCF.valorTotal || "N/A"}
                </p>
              </div>
              {assertiva_data.credito.resposta.chequesSemFundoCCF.list?.map((cheque: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-lg p-3 sm:p-4 space-y-2"
                  style={{ background: "var(--admin-bg-tertiary)", border: "1px solid var(--admin-border)" }}
                >
                  <p className="font-medium text-xs sm:text-sm break-words" style={{ color: "var(--admin-text-primary)" }}>
                    Banco: {cheque.banco || "N/A"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div>
                      <p style={{ color: "var(--admin-text-muted)" }}>Agencia</p>
                      <p style={{ color: "var(--admin-text-primary)" }} className="break-words">{cheque.agencia || "N/A"}</p>
                    </div>
                    <div>
                      <p style={{ color: "var(--admin-text-muted)" }}>Data</p>
                      <p style={{ color: "var(--admin-text-primary)" }} className="break-words">{cheque.data || "N/A"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs sm:text-sm" style={{ color: "var(--admin-green)" }}>
              Nenhum cheque sem fundo encontrado
            </p>
          )}
        </div>
      )}
    </div>
  )
}
