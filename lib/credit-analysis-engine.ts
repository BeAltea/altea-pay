"use server"

// Motor de Análise de Crédito baseado nas regras de negócio AlteaPay
// Implementa o fluxo completo de validação, classificação e decisão

export type Comportamento = "BOM" | "RUIM"
export type Decisao = "ACEITA" | "ACEITA_ESPECIAL" | "REJEITA"
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH"

export interface ClienteCredito {
  creditScore: number // 0–1000 (score da Assertiva)
  atrasos12m: number // nº de atrasos em operações financeiras (12 meses)
  temAcaoJudicial: boolean
  temProtesto: boolean
  temDividaAtiva: boolean
  atrasosCartao24m: number // nº de atrasos em cartão (24 meses)
  limitePresumido: number // R$/mês
  rendaPresumida: number // R$/mês
  valorDivida: number // R$
}

export interface ResultadoRegra {
  decisao: Decisao
  motivo: string
  riskLevel: RiskLevel
  comportamento: Comportamento
  autoCollectionEnabled: boolean
}

// Configuração de parâmetros baseada no PDF AlteaPay
export const RegrasConfig = {
  SCORE_ALTO_MIN: 400, // Score >= 400 = Baixo Risco
  SCORE_MEDIO_MIN: 300, // Score 300-399 = Médio Risco
  SCORE_BAIXO_MAX: 300, // Score < 300 = Alto Risco
  LIMITE_MIN_OK: 300, // R$ / mês
  RENDA_MIN_OK: 2500, // R$ / mês
  RENDA_MIN_CRITICA: 1500, // R$ / mês
  DIVIDA_BAIXA_MAX: 250, // R$
  TICKET_MINIMO_PF: 82, // Viabilidade econômica PF
  TICKET_MINIMO_PJ: 102, // Viabilidade econômica PJ
} as const

/**
 * Classifica o comportamento do cliente baseado em histórico
 */
export function classificarComportamento(cli: ClienteCredito): Comportamento {
  const comportamentoBom =
    cli.atrasos12m === 0 && !cli.temAcaoJudicial && !cli.temProtesto && !cli.temDividaAtiva && cli.atrasosCartao24m <= 2

  return comportamentoBom ? "BOM" : "RUIM"
}

/**
 * Determina o nível de risco baseado no score
 */
export function determinarRiskLevel(score: number): RiskLevel {
  if (score >= RegrasConfig.SCORE_ALTO_MIN) return "LOW" // Bom pagador
  if (score >= RegrasConfig.SCORE_MEDIO_MIN) return "MEDIUM" // Risco médio
  return "HIGH" // Alto risco
}

/**
 * Motor de decisão: decide se o cliente entra na régua de cobrança
 * Implementa as 7 regras de negócio do AlteaPay
 */
export function decidirEntradaRegua(cli: ClienteCredito): ResultadoRegra {
  const c = RegrasConfig
  const comportamento = classificarComportamento(cli)
  const riskLevel = determinarRiskLevel(cli.creditScore)

  // R5 – Renda muito baixa (viabilidade econômica)
  if (cli.rendaPresumida < c.RENDA_MIN_CRITICA) {
    return {
      decisao: "REJEITA",
      motivo: "R5_RENDA_BAIXA",
      riskLevel,
      comportamento,
      autoCollectionEnabled: false,
    }
  }

  // R6 – Limite muito baixo (viabilidade econômica)
  if (cli.limitePresumido < c.LIMITE_MIN_OK) {
    return {
      decisao: "REJEITA",
      motivo: "R6_LIMITE_BAIXO",
      riskLevel,
      comportamento,
      autoCollectionEnabled: false,
    }
  }

  // R1 – Score alto (>= 400) = Risco Baixo = Cobrança Automática
  if (cli.creditScore >= c.SCORE_ALTO_MIN) {
    return {
      decisao: "ACEITA",
      motivo: "R1_SCORE_ALTO",
      riskLevel: "LOW",
      comportamento,
      autoCollectionEnabled: true, // Disparo automático
    }
  }

  // R2 – Score médio (300-399), bom comportamento = Cobrança Assistida
  if (
    cli.creditScore >= c.SCORE_MEDIO_MIN &&
    comportamento === "BOM" &&
    cli.rendaPresumida >= c.RENDA_MIN_OK &&
    cli.limitePresumido >= c.LIMITE_MIN_OK
  ) {
    return {
      decisao: "ACEITA",
      motivo: "R2_SCORE_MEDIO_COMPORTAMENTO_BOM",
      riskLevel: "MEDIUM",
      comportamento,
      autoCollectionEnabled: false, // Cobrança assistida (operador)
    }
  }

  // R3 – Score médio mas comportamento ruim
  if (cli.creditScore >= c.SCORE_MEDIO_MIN) {
    return {
      decisao: "REJEITA",
      motivo: "R3_SCORE_MEDIO_COMPORTAMENTO_RUIM",
      riskLevel: "MEDIUM",
      comportamento,
      autoCollectionEnabled: false,
    }
  }

  // R4 – Score baixo (<300), mas bom comportamento e dívida pequena = Caso Especial
  if (
    cli.creditScore < c.SCORE_MEDIO_MIN &&
    comportamento === "BOM" &&
    cli.rendaPresumida >= c.RENDA_MIN_OK &&
    cli.limitePresumido >= c.LIMITE_MIN_OK &&
    cli.valorDivida <= c.DIVIDA_BAIXA_MAX
  ) {
    return {
      decisao: "ACEITA_ESPECIAL",
      motivo: "R4_SCORE_BAIXO_BOM_COMPORTAMENTO_DIVIDA_PEQUENA",
      riskLevel: "HIGH",
      comportamento,
      autoCollectionEnabled: false, // Cobrança manual
    }
  }

  // R7 – Fallback: rejeita por padrão
  return {
    decisao: "REJEITA",
    motivo: "R7_PADRAO",
    riskLevel,
    comportamento,
    autoCollectionEnabled: false,
  }
}

/**
 * Extrai dados da análise da Assertiva para montar o objeto ClienteCredito
 */
export function extrairDadosAssertivaParaAnalise(assertivaData: any, valorDivida: number): ClienteCredito {
  // Extrair dados do JSON retornado pela Assertiva
  const credito = assertivaData?.credito || {}
  const acoes = assertivaData?.acoes || {}
  const recupere = assertivaData?.recupere || {}
  const comportamental = assertivaData?.analise_comportamental || {}

  return {
    creditScore: assertivaData?.score_geral || 0,
    atrasos12m: comportamental?.atrasos_12_meses || 0,
    temAcaoJudicial: (acoes?.total || 0) > 0,
    temProtesto: (credito?.protestos?.length || 0) > 0,
    temDividaAtiva: (credito?.dividas_ativas?.length || 0) > 0,
    atrasosCartao24m: comportamental?.atrasos_cartao_24_meses || 0,
    limitePresumido: credito?.limite_presumido || 0,
    rendaPresumida: credito?.renda_presumida || 0,
    valorDivida,
  }
}
