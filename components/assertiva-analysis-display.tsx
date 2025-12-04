import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Gavel,
  FileCheck,
  Eye,
  CheckCircle2,
  CreditCard,
  UserCheck,
  BarChart3,
  Receipt,
} from "lucide-react"

interface AssertivaAnalysisDisplayProps {
  data: any
}

export function AssertivaAnalysisDisplay({ data }: AssertivaAnalysisDisplayProps) {
  if (!data) {
    return null
  }

  const creditoData = data.credito?.resposta || {}
  const acoesData = data.acoes?.resposta || {}
  const recupereData = data.recupere?.resposta || {}
  const comportamentalData = data.analise_comportamental || {}

  const score = creditoData.score?.pontos || 0
  const scoreClasse = creditoData.score?.classe || "N/A"
  const scoreFaixa = creditoData.score?.faixa || {}

  const scoreRecupere = recupereData.score?.pontos || 0
  const scoreRecupereClasse = recupereData.score?.classe || "N/A"
  const scoreRecupereFaixa = recupereData.score?.faixa || {}

  const rendaPresumida = creditoData.rendaPresumida?.valor || 0
  const protestos = creditoData.protestosPublicos?.list || []
  const debitos = creditoData.registrosDebitos?.list || []
  const ultimasConsultas = creditoData.ultimasConsultas?.list || []
  const cheques = creditoData.cheques?.list || []

  const acoesJudiciais = acoesData.acoes?.list || []
  const protestosAcoes = acoesData.protestos?.list || []

  const getScoreColor = (points: number) => {
    if (points >= 700) return "text-green-600"
    if (points >= 500) return "text-yellow-600"
    if (points >= 300) return "text-orange-600"
    return "text-red-600"
  }

  const getScoreBadgeVariant = (points: number) => {
    if (points >= 700) return "default"
    if (points >= 500) return "secondary"
    if (points >= 300) return "outline"
    return "destructive"
  }

  return (
    <div className="space-y-6">
      {/* Score Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Score de Crédito Principal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Score de Crédito
            </CardTitle>
            <Badge variant={getScoreBadgeVariant(score)} className="ml-auto">
              Classe {scoreClasse}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
              {score}
              <span className="text-sm text-muted-foreground">/1000</span>
            </div>
            {scoreFaixa.titulo && <p className="text-xs text-muted-foreground mt-2">{scoreFaixa.titulo}</p>}
            {scoreFaixa.descricao && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scoreFaixa.descricao}</p>
            )}
          </CardContent>
        </Card>

        {/* Score Recupere */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-purple-500" />
              Score Recupere
            </CardTitle>
            <Badge variant={getScoreBadgeVariant(scoreRecupere)} className="ml-auto">
              Classe {scoreRecupereClasse}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(scoreRecupere)}`}>
              {scoreRecupere}
              <span className="text-sm text-muted-foreground">/1000</span>
            </div>
            {scoreRecupereFaixa.titulo && (
              <p className="text-xs text-muted-foreground mt-2">{scoreRecupereFaixa.titulo}</p>
            )}
            {scoreRecupereFaixa.descricao && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scoreRecupereFaixa.descricao}</p>
            )}
          </CardContent>
        </Card>

        {/* Renda Presumida */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Renda Presumida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(rendaPresumida)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Valor estimado com base em dados cadastrais</p>
          </CardContent>
        </Card>
      </div>

      {/* Protestos e Débitos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Protestos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Protestos ({protestos.length + protestosAcoes.length})
            </CardTitle>
            <CardDescription>Protestos registrados em cartórios</CardDescription>
          </CardHeader>
          <CardContent>
            {[...protestos, ...protestosAcoes].length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Sem protestos registrados
              </div>
            ) : (
              <div className="space-y-3">
                {[...protestos, ...protestosAcoes].map((protesto: any, index: number) => (
                  <div key={index} className="border-l-2 border-orange-500 pl-3 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium">
                        {protesto.cartorio || protesto.localProtesto || "Cartório não informado"}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          protesto.valor || 0,
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Data: {protesto.dataOcorrencia || protesto.dataProtesto || "N/A"}
                    </p>
                    {protesto.cidade && (
                      <p className="text-xs text-muted-foreground">
                        Cidade: {protesto.cidade}/{protesto.uf}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Débitos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-500" />
              Débitos ({debitos.length})
            </CardTitle>
            <CardDescription>Registros de débitos em aberto</CardDescription>
          </CardHeader>
          <CardContent>
            {debitos.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Sem débitos registrados
              </div>
            ) : (
              <div className="space-y-3">
                {debitos.map((debito: any, index: number) => (
                  <div key={index} className="border-l-2 border-red-500 pl-3 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium">{debito.credor || "Credor não informado"}</p>
                      <Badge variant="destructive" className="text-xs">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          debito.valor || 0,
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Data: {debito.dataOcorrencia || "N/A"}</p>
                    {debito.contrato && <p className="text-xs text-muted-foreground">Contrato: {debito.contrato}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações Judiciais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gavel className="h-5 w-5 text-blue-500" />
            Ações Judiciais ({acoesJudiciais.length})
          </CardTitle>
          <CardDescription>Processos judiciais em andamento</CardDescription>
        </CardHeader>
        <CardContent>
          {acoesJudiciais.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Sem ações judiciais registradas
            </div>
          ) : (
            <div className="space-y-3">
              {acoesJudiciais.map((acao: any, index: number) => (
                <div key={index} className="border-l-2 border-blue-500 pl-3 space-y-1">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium">{acao.tribunal || "Tribunal não informado"}</p>
                    <Badge variant="outline" className="text-xs">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        acao.valorCausa || 0,
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Processo: {acao.numeroProcesso || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">Data: {acao.dataDistribuicao || "N/A"}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cheques e Últimas Consultas */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cheques Sem Fundo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-500" />
              Cheques ({cheques.length})
            </CardTitle>
            <CardDescription>Registros de cheques sem fundo</CardDescription>
          </CardHeader>
          <CardContent>
            {cheques.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Sem cheques sem fundo
              </div>
            ) : (
              <div className="space-y-3">
                {cheques.map((cheque: any, index: number) => (
                  <div key={index} className="border-l-2 border-purple-500 pl-3 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium">Banco: {cheque.banco || "N/A"}</p>
                      <Badge variant="outline" className="text-xs">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          cheque.valor || 0,
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Agência: {cheque.agencia || "N/A"} / Cheque: {cheque.numeroCheque || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">Data: {cheque.dataOcorrencia || "N/A"}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Consultas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-5 w-5 text-cyan-500" />
              Últimas Consultas ({ultimasConsultas.length})
            </CardTitle>
            <CardDescription>Empresas que consultaram recentemente</CardDescription>
          </CardHeader>
          <CardContent>
            {ultimasConsultas.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                Nenhuma consulta registrada
              </div>
            ) : (
              <div className="space-y-3">
                {ultimasConsultas.map((consulta: any, index: number) => (
                  <div key={index} className="border-l-2 border-cyan-500 pl-3 space-y-1">
                    <p className="text-sm font-medium">{consulta.consultante || "Consultante não informado"}</p>
                    <p className="text-xs text-muted-foreground">Data: {consulta.dataOcorrencia || "N/A"}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Análise Comportamental */}
      {comportamentalData && (comportamentalData.uuid || comportamentalData[0]?.uuid) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-500" />
              Análise Comportamental
            </CardTitle>
            <CardDescription>Análise de comportamento de crédito em processamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Em Processamento</Badge>
                <span className="text-sm text-muted-foreground">
                  UUID: {comportamentalData.uuid || comportamentalData[0]?.uuid}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {comportamentalData.mensagem ||
                  comportamentalData[0]?.mensagem ||
                  "Consulta enviada para fila de processamento"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações Técnicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-gray-500" />
            Informações da Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Documento</p>
              <p className="text-sm font-medium">{data.documento || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm font-medium">{data.tipo || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data da Análise</p>
              <p className="text-sm font-medium">
                {data.timestamp ? new Date(data.timestamp).toLocaleString("pt-BR") : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Protocolo Crédito</p>
              <p className="text-sm font-medium text-xs">{data.credito?.cabecalho?.protocolo || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Protocolo Recupere</p>
              <p className="text-sm font-medium text-xs">{data.recupere?.cabecalho?.protocolo || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Protocolo Ações</p>
              <p className="text-sm font-medium text-xs">{data.acoes?.cabecalho?.protocolo || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
