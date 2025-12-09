// Tipos e constantes para o motor de análise de crédito

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
