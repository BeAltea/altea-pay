export interface ClassificationCriteria {
  daysOverdue: number
  amount: number
  customerHistory?: {
    previousPayments: number
    averageDelayDays: number
    totalDebts: number
  }
  paymentBehavior?: "good" | "average" | "poor"
}

export type RiskClassification = "low" | "medium" | "high" | "critical"

export interface ClassificationRule {
  name: string
  condition: (criteria: ClassificationCriteria) => boolean
  classification: RiskClassification
  priority: number // Higher number = higher priority
}

// Default classification rules
export const defaultClassificationRules: ClassificationRule[] = [
  {
    name: "Critical - Over 90 days",
    condition: (criteria) => criteria.daysOverdue > 90,
    classification: "critical",
    priority: 100,
  },
  {
    name: "Critical - High amount over 60 days",
    condition: (criteria) => criteria.daysOverdue > 60 && criteria.amount > 5000,
    classification: "critical",
    priority: 95,
  },
  {
    name: "High - 60-90 days",
    condition: (criteria) => criteria.daysOverdue >= 60 && criteria.daysOverdue <= 90,
    classification: "high",
    priority: 80,
  },
  {
    name: "High - Poor payment behavior over 30 days",
    condition: (criteria) => criteria.daysOverdue > 30 && criteria.customerHistory?.paymentBehavior === "poor",
    classification: "high",
    priority: 75,
  },
  {
    name: "Medium - 30-60 days",
    condition: (criteria) => criteria.daysOverdue >= 30 && criteria.daysOverdue < 60,
    classification: "medium",
    priority: 60,
  },
  {
    name: "Medium - High amount under 30 days",
    condition: (criteria) => criteria.daysOverdue < 30 && criteria.amount > 10000,
    classification: "medium",
    priority: 55,
  },
  {
    name: "Low - Under 30 days",
    condition: (criteria) => criteria.daysOverdue < 30,
    classification: "low",
    priority: 20,
  },
]

export class ClassificationEngine {
  private rules: ClassificationRule[]

  constructor(customRules?: ClassificationRule[]) {
    this.rules = customRules || defaultClassificationRules
    // Sort rules by priority (highest first)
    this.rules.sort((a, b) => b.priority - a.priority)
  }

  classify(criteria: ClassificationCriteria): {
    classification: RiskClassification
    appliedRule: string
    score: number
  } {
    // Find the first rule that matches (highest priority)
    for (const rule of this.rules) {
      if (rule.condition(criteria)) {
        return {
          classification: rule.classification,
          appliedRule: rule.name,
          score: this.calculateScore(criteria),
        }
      }
    }

    // Default to low risk if no rules match
    return {
      classification: "low",
      appliedRule: "Default - No specific rule matched",
      score: this.calculateScore(criteria),
    }
  }

  private calculateScore(criteria: ClassificationCriteria): number {
    let score = 0

    // Days overdue factor (0-100 points)
    if (criteria.daysOverdue > 90) {
      score += 100
    } else if (criteria.daysOverdue > 60) {
      score += 80
    } else if (criteria.daysOverdue > 30) {
      score += 60
    } else if (criteria.daysOverdue > 15) {
      score += 40
    } else {
      score += 20
    }

    // Amount factor (0-50 points)
    if (criteria.amount > 10000) {
      score += 50
    } else if (criteria.amount > 5000) {
      score += 40
    } else if (criteria.amount > 2000) {
      score += 30
    } else if (criteria.amount > 1000) {
      score += 20
    } else {
      score += 10
    }

    // Customer history factor (0-30 points)
    if (criteria.customerHistory) {
      const history = criteria.customerHistory

      // Payment behavior
      if (history.paymentBehavior === "poor") {
        score += 30
      } else if (history.paymentBehavior === "average") {
        score += 15
      } else {
        score += 5
      }

      // Average delay
      if (history.averageDelayDays > 60) {
        score += 20
      } else if (history.averageDelayDays > 30) {
        score += 10
      }

      // Multiple debts penalty
      if (history.totalDebts > 3) {
        score += 15
      } else if (history.totalDebts > 1) {
        score += 5
      }
    }

    return Math.min(score, 200) // Cap at 200
  }

  classifyBatch(criteriaList: ClassificationCriteria[]): Array<{
    criteria: ClassificationCriteria
    result: {
      classification: RiskClassification
      appliedRule: string
      score: number
    }
  }> {
    return criteriaList.map((criteria) => ({
      criteria,
      result: this.classify(criteria),
    }))
  }

  addRule(rule: ClassificationRule): void {
    this.rules.push(rule)
    this.rules.sort((a, b) => b.priority - a.priority)
  }

  removeRule(ruleName: string): void {
    this.rules = this.rules.filter((rule) => rule.name !== ruleName)
  }

  getRules(): ClassificationRule[] {
    return [...this.rules]
  }

  getClassificationStats(criteriaList: ClassificationCriteria[]): {
    total: number
    low: number
    medium: number
    high: number
    critical: number
    averageScore: number
  } {
    const results = this.classifyBatch(criteriaList)

    const stats = {
      total: results.length,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
      averageScore: 0,
    }

    let totalScore = 0

    for (const result of results) {
      stats[result.result.classification]++
      totalScore += result.result.score
    }

    stats.averageScore = results.length > 0 ? totalScore / results.length : 0

    return stats
  }
}

// Utility function to create classification criteria from debt data
export function createClassificationCriteria(debt: {
  daysOverdue: number
  currentAmount: number
  customerHistory?: any
}): ClassificationCriteria {
  return {
    daysOverdue: debt.daysOverdue,
    amount: debt.currentAmount,
    customerHistory: debt.customerHistory,
  }
}

// Utility function to get classification color
export function getClassificationColor(classification: RiskClassification): string {
  switch (classification) {
    case "low":
      return "green"
    case "medium":
      return "yellow"
    case "high":
      return "orange"
    case "critical":
      return "red"
    default:
      return "gray"
  }
}

// Utility function to get next recommended action
export function getRecommendedAction(classification: RiskClassification, daysOverdue: number): string {
  switch (classification) {
    case "critical":
      if (daysOverdue > 120) {
        return "Ação judicial / Negativação"
      }
      return "Ligação telefônica urgente"
    case "high":
      return "Email de cobrança + SMS"
    case "medium":
      return "Email de cobrança"
    case "low":
      return "Email de lembrete"
    default:
      return "Monitorar"
  }
}
