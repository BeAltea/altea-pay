// Dummy Propensity Engine - Ready for AI Integration
// This engine generates mock scores but is architected to easily plug in real ML models

export interface PropensityScores {
  paymentScore: number
  loanScore: number
  confidence: number
  factors: string[]
}

export interface DebtData {
  id: string
  amount: number
  daysOverdue: number
  customerHistory?: {
    totalDebts: number
    paidDebts: number
    avgPaymentDelay: number
  }
  classification?: string
}

export class PropensityEngine {
  private static instance: PropensityEngine

  private constructor() {}

  static getInstance(): PropensityEngine {
    if (!PropensityEngine.instance) {
      PropensityEngine.instance = new PropensityEngine()
    }
    return PropensityEngine.instance
  }

  /**
   * Calculate propensity scores for a single debt
   * In production, this would call ML models or external APIs
   */
  async calculateScores(debtData: DebtData): Promise<PropensityScores> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    return this.generateMockScores(debtData)
  }

  /**
   * Calculate propensity scores for multiple debts (batch processing)
   */
  async calculateBatchScores(debtsData: DebtData[]): Promise<Map<string, PropensityScores>> {
    // Simulate batch processing delay
    await new Promise((resolve) => setTimeout(resolve, 200))

    const results = new Map<string, PropensityScores>()

    for (const debt of debtsData) {
      results.set(debt.id, this.generateMockScores(debt))
    }

    return results
  }

  /**
   * Generate mock scores based on debt characteristics
   * This simulates what a real ML model would do
   */
  private generateMockScores(debtData: DebtData): PropensityScores {
    const { amount, daysOverdue, customerHistory, classification } = debtData

    // Base scores
    let paymentScore = 50
    let loanScore = 30
    const factors: string[] = []

    // Amount factor (smaller debts more likely to be paid)
    if (amount < 500) {
      paymentScore += 20
      factors.push("Valor baixo favorece pagamento")
    } else if (amount > 2000) {
      paymentScore -= 15
      loanScore += 10
      factors.push("Valor alto reduz pagamento, aumenta interesse em empréstimo")
    }

    // Days overdue factor
    if (daysOverdue < 30) {
      paymentScore += 25
      factors.push("Atraso recente - alta propensão ao pagamento")
    } else if (daysOverdue > 90) {
      paymentScore -= 30
      loanScore += 15
      factors.push("Atraso longo - baixa propensão ao pagamento")
    }

    // Customer history factor
    if (customerHistory) {
      const paymentRate = customerHistory.paidDebts / customerHistory.totalDebts
      if (paymentRate > 0.8) {
        paymentScore += 15
        factors.push("Histórico de bom pagador")
      } else if (paymentRate < 0.3) {
        paymentScore -= 20
        loanScore += 20
        factors.push("Histórico de inadimplência")
      }
    }

    // Classification factor
    if (classification === "high_risk") {
      paymentScore -= 25
      loanScore += 25
      factors.push("Classificação de alto risco")
    } else if (classification === "low_risk") {
      paymentScore += 20
      factors.push("Classificação de baixo risco")
    }

    // Add some randomness to simulate real-world variability
    const randomFactor = (Math.random() - 0.5) * 20
    paymentScore += randomFactor
    loanScore += randomFactor * 0.5

    // Ensure scores are within bounds
    paymentScore = Math.max(0, Math.min(100, paymentScore))
    loanScore = Math.max(0, Math.min(100, loanScore))

    // Calculate confidence based on available data
    let confidence = 60
    if (customerHistory) confidence += 20
    if (classification) confidence += 10
    if (daysOverdue > 0) confidence += 10

    return {
      paymentScore: Math.round(paymentScore * 100) / 100,
      loanScore: Math.round(loanScore * 100) / 100,
      confidence: Math.min(100, confidence),
      factors,
    }
  }

  /**
   * Future method for integrating with real ML models
   * This is where you would call external APIs or load ML models
   */
  async integrateWithMLModel(debtData: DebtData): Promise<PropensityScores> {
    // TODO: Integrate with real ML model
    // Example integrations:
    // - Call to Serasa API
    // - TensorFlow.js model
    // - External ML service
    // - Credit bureau APIs

    throw new Error("ML model integration not implemented yet")
  }
}

export const propensityEngine = PropensityEngine.getInstance()
