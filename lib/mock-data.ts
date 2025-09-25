export interface Debt {
  id: string
  description: string
  amount: number
  due_date: string
  status: "open" | "overdue" | "paid" | "in_collection" | "negotiated"
  classification: "critical" | "high" | "medium" | "low"
  propensity_payment_score: number
  propensity_loan_score: number
  created_at: string
  customers: {
    name: string
    email: string
  }
}

export interface Payment {
  id: string
  debt_id: string
  amount: number
  status: "completed" | "pending" | "failed"
  payment_method: "pix" | "boleto" | "credit_card" | "debit_card"
  created_at: string
}

export interface Agreement {
  id: string
  debt_id: string
  status: "accepted" | "pending" | "rejected" | "under_review"
  discount_percentage: number
  installments: number
  created_at: string
}

// Centralized mock data - ALL pages must use this exact data
export const MOCK_DEBTS: Debt[] = [
  {
    id: "1",
    description: "Fatura Janeiro 2024 - Serviços de Consultoria Empresarial",
    amount: 2500.0,
    due_date: "2024-02-15",
    status: "overdue",
    classification: "high",
    propensity_payment_score: 45.3,
    propensity_loan_score: 32.1,
    created_at: "2024-01-15T10:30:00Z",
    customers: {
      name: "João Silva Santos",
      email: "joao.silva@email.com",
    },
  },
  {
    id: "2",
    description: "Licença Software - Plano Premium Anual",
    amount: 1800.0,
    due_date: "2024-03-01",
    status: "open",
    classification: "medium",
    propensity_payment_score: 78.5,
    propensity_loan_score: 65.2,
    created_at: "2024-02-01T14:20:00Z",
    customers: {
      name: "Maria Santos Oliveira",
      email: "maria.santos@email.com",
    },
  },
  {
    id: "3",
    description: "Desenvolvimento Website - E-commerce Completo",
    amount: 3200.0,
    due_date: "2024-03-15",
    status: "open",
    classification: "low",
    propensity_payment_score: 82.7,
    propensity_loan_score: 71.4,
    created_at: "2024-02-15T09:15:00Z",
    customers: {
      name: "Carlos Oliveira Costa",
      email: "carlos.oliveira@email.com",
    },
  },
  {
    id: "4",
    description: "Hospedagem Servidor - Plano Enterprise Premium",
    amount: 950.0,
    due_date: "2024-02-28",
    status: "paid",
    classification: "low",
    propensity_payment_score: 91.2,
    propensity_loan_score: 85.6,
    created_at: "2024-01-28T16:45:00Z",
    customers: {
      name: "Ana Costa Silva",
      email: "ana.costa@email.com",
    },
  },
  {
    id: "5",
    description: "Suporte Técnico - Pacote Premium Q1 2024",
    amount: 1200.0,
    due_date: "2024-01-10",
    status: "in_collection",
    classification: "critical",
    propensity_payment_score: 28.9,
    propensity_loan_score: 15.3,
    created_at: "2024-01-01T11:30:00Z",
    customers: {
      name: "Roberto Lima Pereira",
      email: "roberto.lima@email.com",
    },
  },
  {
    id: "6",
    description: "Consultoria SEO - Otimização Completa Website",
    amount: 1500.0,
    due_date: "2024-04-01",
    status: "open",
    classification: "medium",
    propensity_payment_score: 67.8,
    propensity_loan_score: 54.3,
    created_at: "2024-03-01T08:00:00Z",
    customers: {
      name: "Fernanda Souza Lima",
      email: "fernanda.souza@email.com",
    },
  },
]

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: "pay-1",
    debt_id: "4",
    amount: 950.0,
    status: "completed",
    payment_method: "pix",
    created_at: "2024-02-28T10:15:00Z",
  },
  {
    id: "pay-2",
    debt_id: "1",
    amount: 500.0,
    status: "pending",
    payment_method: "boleto",
    created_at: "2024-03-01T14:30:00Z",
  },
  {
    id: "pay-3",
    debt_id: "2",
    amount: 1800.0,
    status: "failed",
    payment_method: "credit_card",
    created_at: "2024-02-25T16:45:00Z",
  },
]

export const MOCK_AGREEMENTS: Agreement[] = [
  {
    id: "agr-1",
    debt_id: "1",
    status: "pending",
    discount_percentage: 15,
    installments: 3,
    created_at: "2024-03-01T09:00:00Z",
  },
  {
    id: "agr-2",
    debt_id: "5",
    status: "under_review",
    discount_percentage: 25,
    installments: 6,
    created_at: "2024-02-28T11:30:00Z",
  },
]

// Utility functions for consistent calculations
export const getOpenDebts = (debts: Debt[] = MOCK_DEBTS) =>
  debts.filter((debt) => ["open", "overdue", "in_collection"].includes(debt.status))

export const getOverdueDebts = (debts: Debt[] = MOCK_DEBTS) => debts.filter((debt) => debt.status === "overdue")

export const getPaidDebts = (debts: Debt[] = MOCK_DEBTS) => debts.filter((debt) => debt.status === "paid")

export const getTotalOpenAmount = (debts: Debt[] = MOCK_DEBTS) =>
  getOpenDebts(debts).reduce((sum, debt) => sum + debt.amount, 0)

export const getTotalPaidAmount = (debts: Debt[] = MOCK_DEBTS) =>
  getPaidDebts(debts).reduce((sum, debt) => sum + debt.amount, 0)

export const getAveragePaymentScore = (debts: Debt[] = MOCK_DEBTS) => {
  const openDebts = getOpenDebts(debts)
  return openDebts.length
    ? openDebts.reduce((sum, debt) => sum + debt.propensity_payment_score, 0) / openDebts.length
    : 0
}

export const getAverageLoanScore = (debts: Debt[] = MOCK_DEBTS) => {
  const openDebts = getOpenDebts(debts)
  return openDebts.length ? openDebts.reduce((sum, debt) => sum + debt.propensity_loan_score, 0) / openDebts.length : 0
}

// Profile data
export const MOCK_PROFILE = {
  id: "user-1",
  full_name: "João Silva Santos",
  email: "joao.silva@email.com",
  created_at: "2024-01-01T00:00:00Z",
}

console.log(
  "[v0] Mock Data System - Loaded with",
  MOCK_DEBTS.length,
  "debts,",
  MOCK_PAYMENTS.length,
  "payments,",
  MOCK_AGREEMENTS.length,
  "agreements",
)
