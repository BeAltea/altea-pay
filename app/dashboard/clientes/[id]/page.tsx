import { createServerClient, createAdminClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Sparkles, AlertCircle, AlertTriangle, TrendingUp, FileText } from "lucide-react"
import { AssertivaAnalysisDisplay } from "@/components/assertiva-analysis-display"

export default async function ClienteDetalhesPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()
  const adminSupabase = createAdminClient()

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

  const cleanDoc = cliente["CPF/CNPJ"]?.replace(/\D/g, "")
  const cleanCpf = cliente["CPF/CNPJ"]?.replace(/\D/g, "")

  console.log("[v0] 🔍 Cliente detail - Buscando análise de crédito:", {
    cliente_id: params.id,
    cliente_nome: cliente.Nome || cliente.Cliente,
    cpf_original: cliente["CPF/CNPJ"],
    cpf_limpo: cleanCpf,
    company_id: profile.company_id,
  })

  const { data: allProfilesForId } = await adminSupabase
    .from("credit_profiles")
    .select("*")
    .eq("customer_id", params.id)

  console.log("[v0] 📋 TODOS credit_profiles com customer_id:", {
    customer_id: params.id,
    total_found: allProfilesForId?.length || 0,
  })

  const { data: allProfilesForCpf } = await adminSupabase.from("credit_profiles").select("*").eq("cpf", cleanCpf)

  console.log("[v0] 📋 TODOS credit_profiles com CPF:", {
    cpf: cleanCpf,
    total_found: allProfilesForCpf?.length || 0,
  })

  const { data: creditProfile, error: profileError } = await adminSupabase
    .from("credit_profiles")
    .select("*")
    .eq("customer_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  console.log("[v0] Cliente detail - Credit profile por customer_id:", {
    found: !!creditProfile,
    error: profileError?.message || null,
    profile_id: creditProfile?.id,
    profile_source: creditProfile?.source,
    profile_score_assertiva: creditProfile?.score_assertiva,
  })

  let finalCreditProfile = creditProfile

  if (!creditProfile && cleanCpf) {
    const { data: profileByCpf } = await adminSupabase
      .from("credit_profiles")
      .select("*")
      .eq("cpf", cleanCpf)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log("[v0] Cliente detail - Credit profile por CPF (fallback):", {
      found: !!profileByCpf,
      profile_id: profileByCpf?.id,
      profile_score_assertiva: profileByCpf?.score_assertiva,
    })

    finalCreditProfile = profileByCpf
  }

  const { data: integrationLogs } = await supabase
    .from("integration_logs")
    .select("*")
    .eq("cpf", cleanCpf)
    .order("created_at", { ascending: false })
    .limit(10)

  console.log("[v0] Cliente detail - Integration logs:", {
    cpf: cleanCpf,
    found: integrationLogs?.length || 0,
  })

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detalhes do Cliente</h1>
          <p className="text-muted-foreground">{cliente.Nome || cliente.Cliente || "Cliente"}</p>
        </div>
      </div>

      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{cliente.Nome || cliente.Cliente || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
              <p className="font-medium">{cliente["CPF/CNPJ"] || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cidade</p>
              <p className="font-medium">{cliente.Cidade || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">UF</p>
              <p className="font-medium">{cliente.UF || "N/A"}</p>
            </div>
            {cliente.Empresa && (
              <div>
                <p className="text-sm text-muted-foreground">Empresa</p>
                <p className="font-medium">{cliente.Empresa}</p>
              </div>
            )}
            {cliente.Cliente_Id && (
              <div>
                <p className="text-sm text-muted-foreground">ID do Cliente</p>
                <p className="font-medium font-mono text-xs">{cliente.Cliente_Id}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações Financeiras */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Financeiras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {cliente["Dias_Inad"] && (
              <div>
                <p className="text-sm text-muted-foreground">Dias em Inadimplência</p>
                <Badge variant="destructive" className="mt-1 text-lg">
                  {cliente["Dias_Inad"]} dias
                </Badge>
              </div>
            )}
            {cliente.Vencido && (
              <div>
                <p className="text-sm text-muted-foreground">Valor Vencido</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {Number.parseFloat(cliente.Vencido.toString().replace(",", ".")).toFixed(2)}
                </p>
              </div>
            )}
            {cliente.Vincendo && (
              <div>
                <p className="text-sm text-muted-foreground">Valor Vincendo</p>
                <p className="text-2xl font-bold text-orange-600">
                  R$ {Number.parseFloat(cliente.Vincendo.toString().replace(",", ".")).toFixed(2)}
                </p>
              </div>
            )}
            {cliente.DT_Cancelamento && (
              <div>
                <p className="text-sm text-muted-foreground">Data de Cancelamento</p>
                <p className="font-medium">{new Date(cliente.DT_Cancelamento).toLocaleDateString("pt-BR")}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Análise de Crédito */}
      {finalCreditProfile ? (
        <div className="space-y-4">
          {finalCreditProfile.is_consolidated && (
            <Badge className="bg-purple-600 text-lg px-4 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Perfil Consolidado
            </Badge>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            {/* Score Card */}
            {finalCreditProfile.score_assertiva !== null && finalCreditProfile.score_assertiva !== undefined && (
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs uppercase tracking-wide">Score de Crédito</CardDescription>
                  <CardTitle
                    className={`text-5xl font-bold ${
                      finalCreditProfile.score_assertiva >= 700
                        ? "text-green-600 dark:text-green-400"
                        : finalCreditProfile.score_assertiva >= 500
                          ? "text-yellow-600 dark:text-yellow-400"
                          : finalCreditProfile.score_assertiva >= 300
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {finalCreditProfile.score_assertiva}
                  </CardTitle>
                  {finalCreditProfile.risk_level && (
                    <Badge className="mt-2">Risco: {finalCreditProfile.risk_level}</Badge>
                  )}
                </CardHeader>
              </Card>
            )}

            {/* Sanctions Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wide">Total de Sanções</CardDescription>
                <CardTitle className="text-5xl font-bold text-red-600 dark:text-red-400">
                  {finalCreditProfile.sanctions_count ||
                    finalCreditProfile.data?.sancoes_ceis?.length ||
                    finalCreditProfile.data_gov?.sancoes_ceis?.length ||
                    0}
                </CardTitle>
                {finalCreditProfile.has_sanctions && (
                  <Badge variant="destructive" className="mt-2">
                    Tem Sanções
                  </Badge>
                )}
              </CardHeader>
            </Card>

            {/* Public Bonds Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wide">Vínculos Públicos</CardDescription>
                <CardTitle className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {finalCreditProfile.has_public_bonds ? "Sim" : "Não"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {finalCreditProfile.has_public_bonds ? "Possui vínculo" : "Sem vínculo"}
                </p>
              </CardHeader>
            </Card>

            {/* Data Source Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs uppercase tracking-wide">Fonte de Dados</CardDescription>
                <CardTitle className="text-lg font-bold">Análise de Crédito</CardTitle>
                {finalCreditProfile.data_assertiva && (
                  <Badge variant="secondary" className="mt-2">
                    Dados Disponíveis
                  </Badge>
                )}
              </CardHeader>
            </Card>
          </div>

          {finalCreditProfile.source === "assertiva" && finalCreditProfile.data && (
            <>
              {/* Score Recupere */}
              {(finalCreditProfile.data.score_recupere || finalCreditProfile.data.recupere?.resposta?.score) && (
                <Card className="border-l-4 border-green-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <TrendingUp className="h-5 w-5" />
                      Score Recupere
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                          {finalCreditProfile.data.score_recupere?.pontos ||
                            finalCreditProfile.data.recupere?.resposta?.score?.pontos}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Classe:{" "}
                          {finalCreditProfile.data.score_recupere?.classe ||
                            finalCreditProfile.data.recupere?.resposta?.score?.classe}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-300">
                        {finalCreditProfile.data.score_recupere?.faixa?.titulo ||
                          finalCreditProfile.data.recupere?.resposta?.score?.faixa?.titulo ||
                          "Índice de Recuperação"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Renda Presumida */}
              {(finalCreditProfile.data.renda_presumida ||
                finalCreditProfile.data.credito?.resposta?.rendaPresumida) && (
                <Card className="border-l-4 border-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <TrendingUp className="h-5 w-5" />
                      Renda Presumida
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                      R${" "}
                      {(
                        finalCreditProfile.data.renda_presumida?.valor ||
                        finalCreditProfile.data.credito?.resposta?.rendaPresumida?.valor ||
                        0
                      ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Débitos */}
              {(finalCreditProfile.data.debitos || finalCreditProfile.data.credito?.resposta?.registrosDebitos) && (
                <Card className="border-l-4 border-orange-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <AlertCircle className="h-5 w-5" />
                      Débitos (
                      {
                        (
                          finalCreditProfile.data.debitos?.list ||
                          finalCreditProfile.data.credito?.resposta?.registrosDebitos?.list ||
                          []
                        ).length
                      }
                      )
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(
                      finalCreditProfile.data.debitos?.list ||
                      finalCreditProfile.data.credito?.resposta?.registrosDebitos?.list ||
                      []
                    ).length > 0 ? (
                      <div className="space-y-3">
                        {(
                          finalCreditProfile.data.debitos?.list ||
                          finalCreditProfile.data.credito?.resposta?.registrosDebitos?.list ||
                          []
                        ).map((debito: any, index: number) => (
                          <div key={index} className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-orange-900 dark:text-orange-100">
                                  {debito.credor || "Credor não informado"}
                                </p>
                                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                  R$ {(debito.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="rounded-lg border-2 border-orange-500 bg-orange-100 dark:bg-orange-900/30 p-4">
                          <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                            Total: R${" "}
                            {(
                              finalCreditProfile.data.debitos?.valorTotal ||
                              finalCreditProfile.data.credito?.resposta?.registrosDebitos?.valorTotal ||
                              0
                            ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
                        <p className="text-sm text-green-800 dark:text-green-200">✅ Nenhum débito encontrado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Protestos */}
              {(finalCreditProfile.data.protestos || finalCreditProfile.data.credito?.resposta?.protestosPublicos) && (
                <Card className="border-l-4 border-red-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-5 w-5" />
                      Protestos (
                      {
                        (
                          finalCreditProfile.data.protestos?.list ||
                          finalCreditProfile.data.credito?.resposta?.protestosPublicos?.list ||
                          []
                        ).length
                      }
                      )
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(
                      finalCreditProfile.data.protestos?.list ||
                      finalCreditProfile.data.credito?.resposta?.protestosPublicos?.list ||
                      []
                    ).length > 0 ? (
                      <div className="space-y-3">
                        {(
                          finalCreditProfile.data.protestos?.list ||
                          finalCreditProfile.data.credito?.resposta?.protestosPublicos?.list ||
                          []
                        ).map((protesto: any, index: number) => (
                          <div key={index} className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4">
                            <div className="space-y-2">
                              <p className="font-semibold text-red-900 dark:text-red-100">
                                {protesto.cartorio || "Cartório não informado"}
                              </p>
                              <p className="text-sm text-red-800 dark:text-red-200">
                                Valor: R$ {(protesto.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                              {protesto.data && (
                                <p className="text-sm text-red-700 dark:text-red-300">
                                  Data: {new Date(protesto.data).toLocaleDateString("pt-BR")}
                                </p>
                              )}
                              {protesto.cidade && (
                                <p className="text-sm text-red-700 dark:text-red-300">Cidade: {protesto.cidade}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
                        <p className="text-sm text-green-800 dark:text-green-200">✅ Nenhum protesto encontrado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Ações Judiciais */}
              {(finalCreditProfile.data.acoes_judiciais || finalCreditProfile.data.acoes?.resposta?.acoes) && (
                <Card className="border-l-4 border-purple-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                      <FileText className="h-5 w-5" />
                      Ações Judiciais (
                      {
                        (
                          finalCreditProfile.data.acoes_judiciais?.list ||
                          finalCreditProfile.data.acoes?.resposta?.acoes ||
                          []
                        ).length
                      }
                      )
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(
                      finalCreditProfile.data.acoes_judiciais?.list ||
                      finalCreditProfile.data.acoes?.resposta?.acoes ||
                      []
                    ).length > 0 ? (
                      <div className="space-y-3">
                        {(
                          finalCreditProfile.data.acoes_judiciais?.list ||
                          finalCreditProfile.data.acoes?.resposta?.acoes ||
                          []
                        ).map((acao: any, index: number) => (
                          <div key={index} className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-4">
                            <div className="space-y-2">
                              <p className="font-semibold text-purple-900 dark:text-purple-100">
                                {acao.tribunal || "Tribunal não informado"}
                              </p>
                              {acao.processo && (
                                <p className="text-sm text-purple-800 dark:text-purple-200">
                                  Processo: {acao.processo}
                                </p>
                              )}
                              {acao.valorCausa && (
                                <p className="text-sm text-purple-800 dark:text-purple-200">
                                  Valor da Causa: R${" "}
                                  {acao.valorCausa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
                        <p className="text-sm text-green-800 dark:text-green-200">
                          ✅ Nenhuma ação judicial encontrada
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {finalCreditProfile.data && (
            <>
              {/* CEIS Sanctions */}
              {finalCreditProfile.data.sancoes_ceis &&
                Array.isArray(finalCreditProfile.data.sancoes_ceis) &&
                finalCreditProfile.data.sancoes_ceis.length > 0 && (
                  <Card className="border-l-4 border-red-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                        Sanções CEIS ({finalCreditProfile.data.sancoes_ceis.length})
                      </CardTitle>
                      <CardDescription>Cadastro de Empresas Inidôneas e Suspensas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {finalCreditProfile.data.sancoes_ceis.map((sancao: any, index: number) => (
                          <div
                            key={index}
                            className="rounded-lg bg-red-50 dark:bg-red-950/20 p-4 border border-red-200 dark:border-red-800"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-semibold text-red-900 dark:text-red-100">
                                    {sancao.fonteSancao?.nomeExibicao ||
                                      sancao.orgaoSancionador ||
                                      "Órgão não informado"}
                                  </p>
                                  {sancao.tipoSancao && (
                                    <Badge variant="destructive" className="mt-1">
                                      {sancao.tipoSancao}
                                    </Badge>
                                  )}
                                </div>
                                {sancao.dataPublicacao && (
                                  <p className="text-sm text-red-700 dark:text-red-300">
                                    {new Date(sancao.dataPublicacao).toLocaleDateString("pt-BR")}
                                  </p>
                                )}
                              </div>
                              {sancao.fundamentacaoLegal && (
                                <p className="text-sm text-red-800 dark:text-red-200">
                                  <span className="font-medium">Fundamentação:</span> {sancao.fundamentacaoLegal}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* CNEP Punishments */}
              {finalCreditProfile.data.punicoes_cnep &&
                Array.isArray(finalCreditProfile.data.punicoes_cnep) &&
                finalCreditProfile.data.punicoes_cnep.length > 0 && (
                  <Card className="border-l-4 border-orange-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                        <AlertCircle className="h-5 w-5" />
                        Punições CNEP ({finalCreditProfile.data.punicoes_cnep.length})
                      </CardTitle>
                      <CardDescription>Cadastro Nacional de Empresas Punidas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {finalCreditProfile.data.punicoes_cnep.map((punicao: any, index: number) => (
                          <div
                            key={index}
                            className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-4 border border-orange-200 dark:border-orange-800"
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-semibold text-lg text-orange-900 dark:text-orange-100">
                                    {punicao.orgaoSancionador?.nome || "Órgão não informado"}
                                  </p>
                                  {punicao.orgaoSancionador?.cnpjFormatado && (
                                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                      CNPJ: {punicao.orgaoSancionador.cnpjFormatado}
                                    </p>
                                  )}
                                  {punicao.tipoSancao?.descricaoResumida && (
                                    <Badge
                                      variant="outline"
                                      className="mt-2 border-orange-500 text-orange-700 dark:text-orange-300"
                                    >
                                      {punicao.tipoSancao.descricaoResumida}
                                    </Badge>
                                  )}
                                </div>
                                {punicao.dataPublicacaoSancao && (
                                  <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                                    {new Date(punicao.dataPublicacaoSancao).toLocaleDateString("pt-BR")}
                                  </p>
                                )}
                              </div>

                              {punicao.valorMulta && (
                                <p className="text-sm text-orange-800 dark:text-orange-200">
                                  <span className="font-medium">Valor da Multa:</span> R${" "}
                                  {punicao.valorMulta.toLocaleString("pt-BR")}
                                </p>
                              )}
                              {punicao.fundamentacaoLegal && (
                                <p className="text-sm text-orange-800 dark:text-orange-200">
                                  <span className="font-medium">Fundamentação:</span> {punicao.fundamentacaoLegal}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* CEPIM Impediments */}
              {finalCreditProfile.data.impedimentos_cepim &&
                Array.isArray(finalCreditProfile.data.impedimentos_cepim) &&
                finalCreditProfile.data.impedimentos_cepim.length > 0 && (
                  <Card className="border-l-4 border-purple-500">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <AlertTriangle className="h-5 w-5" />
                        Impedimentos CEPIM ({finalCreditProfile.data.impedimentos_cepim.length})
                      </CardTitle>
                      <CardDescription>Cadastro de Entidades Privadas sem Fins Lucrativos Impedidas</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {finalCreditProfile.data.impedimentos_cepim.map((impedimento: any, index: number) => (
                          <div
                            key={index}
                            className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-4 border border-purple-200 dark:border-purple-800"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-semibold text-lg text-purple-900 dark:text-purple-100">
                                    {impedimento.pessoaJuridica?.nome ||
                                      impedimento.pessoaJuridica?.razaoSocialReceita ||
                                      impedimento.nome ||
                                      "Nome não informado"}
                                  </p>
                                  {impedimento.pessoaJuridica?.cnpjFormatado && (
                                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                      CNPJ: {impedimento.pessoaJuridica.cnpjFormatado}
                                    </p>
                                  )}
                                  {impedimento.orgaoSuperior?.nome && (
                                    <Badge
                                      variant="outline"
                                      className="mt-2 border-purple-500 text-purple-700 dark:text-purple-300"
                                    >
                                      {impedimento.orgaoSuperior.nome}
                                    </Badge>
                                  )}
                                </div>
                                {impedimento.dataReferencia && (
                                  <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                                    {impedimento.dataReferencia}
                                  </p>
                                )}
                              </div>

                              {impedimento.motivo && (
                                <div className="bg-purple-100 dark:bg-purple-900/30 rounded p-3">
                                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                                    Motivo do Impedimento:
                                  </p>
                                  <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
                                    {typeof impedimento.motivo === "string"
                                      ? impedimento.motivo
                                      : impedimento.motivo?.descricaoPortal ||
                                        impedimento.motivo?.descricaoResumida ||
                                        "Motivo não especificado"}
                                  </p>
                                </div>
                              )}

                              {impedimento.convenio && (
                                <div className="space-y-1">
                                  <p className="text-sm text-purple-800 dark:text-purple-200">
                                    <span className="font-medium">Convênio:</span>{" "}
                                    {impedimento.convenio.numero || impedimento.convenio.codigo}
                                  </p>
                                  {impedimento.convenio.objeto && (
                                    <p className="text-sm text-purple-700 dark:text-purple-300 ml-4">
                                      {typeof impedimento.convenio.objeto === "string"
                                        ? impedimento.convenio.objeto
                                        : impedimento.convenio.objeto?.descricaoPortal ||
                                          impedimento.convenio.objeto?.descricaoResumida ||
                                          ""}
                                    </p>
                                  )}
                                </div>
                              )}

                              {impedimento.pessoaJuridica?.uf && (
                                <p className="text-sm text-purple-700 dark:text-purple-300">
                                  <span className="font-medium">Estado:</span> {impedimento.pessoaJuridica.uf}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </>
          )}

          {/* Integration Logs */}
          {integrationLogs && integrationLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Logs de Integração</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {integrationLogs.map((log: any, index: number) => (
                    <div key={index} className="rounded-lg bg-gray-50 dark:bg-gray-950/20 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {log.source || "Fonte não informada"}
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                            Status: {log.status || "Status não informado"}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          Data: {new Date(log.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Complete Assertiva Data Display */}
          {finalCreditProfile?.data_assertiva && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-500" />
                Análise de Crédito Completa
              </h2>
              <AssertivaAnalysisDisplay data={finalCreditProfile.data_assertiva} />
            </div>
          )}

          {/* No Analysis Data */}
          {!finalCreditProfile.data && (
            <Card className="border-2 border-dashed">
              <CardContent className="pt-6 text-center">
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">Análise Não Realizada</p>
                  <p className="text-sm mt-2">
                    Esta análise ainda não foi executada ou os dados não estão disponíveis.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhuma análise de crédito encontrada para este cliente</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
