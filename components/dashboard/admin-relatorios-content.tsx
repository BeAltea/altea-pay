"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CreditCard,
  DollarSign,
  Handshake,
  TrendingUp,
  Eye,
  Download,
  Calendar,
} from "lucide-react"

interface TopDebtor {
  id: string
  name: string
  value: number
  daysOverdue: number
  status: string
}

interface RecentNegotiation {
  id: string
  customerId: string
  status: string
  value: number
  createdAt: string
}

interface ReportData {
  totalDebts: number
  totalDebtValue: number
  activeNegotiations: number
  recoveryRate: number
  debtsByStatus: {
    em_aberto: number
    em_negociacao: number
    acordo_firmado: number
    quitada: number
  }
  topDebtors: TopDebtor[]
  recentNegotiations: RecentNegotiation[]
  totalRecovered: number
}

interface AdminRelatoriosContentProps {
  reportData: ReportData
  company: { id: string; name: string } | null
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR")
  } catch {
    return "—"
  }
}

function getDaysColor(days: number): string {
  if (days <= 30) return "var(--admin-green)"
  if (days <= 90) return "var(--admin-orange)"
  return "var(--admin-red)"
}

type TabType = "live" | "daily" | "weekly" | "monthly"

export function AdminRelatoriosContent({ reportData, company }: AdminRelatoriosContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>("live")

  const companyName = company?.name || "Empresa"

  const tabs = [
    { id: "live" as const, label: "Ao Vivo" },
    { id: "daily" as const, label: "Diario" },
    { id: "weekly" as const, label: "Semanal" },
    { id: "monthly" as const, label: "Mensal" },
  ]

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    em_aberto: { label: "Em aberto", color: "var(--admin-red)", bg: "var(--admin-red-bg)" },
    em_negociacao: { label: "Em negociacao", color: "var(--admin-orange)", bg: "var(--admin-orange-bg)" },
    acordo_firmado: { label: "Acordo firmado", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
    quitada: { label: "Quitada", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
    active: { label: "Ativo", color: "var(--admin-blue)", bg: "var(--admin-blue-bg)" },
    draft: { label: "Aberto", color: "var(--admin-blue)", bg: "var(--admin-blue-bg)" },
    completed: { label: "Concluido", color: "var(--admin-green)", bg: "var(--admin-green-bg)" },
  }

  // Calculate totals for status breakdown
  const totalDebtsByStatus = Object.values(reportData.debtsByStatus).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-[26px] font-bold mb-1"
            style={{ fontFamily: "'Playfair Display', serif", color: "var(--admin-text-primary)" }}
          >
            Relatorios — {companyName}
          </h1>
          <p style={{ color: "var(--admin-text-secondary)", fontSize: "14px" }}>
            Acompanhe o desempenho da sua operacao de cobranca
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-lg"
        style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? "var(--admin-gold-400)" : "transparent",
              color: activeTab === tab.id ? "var(--admin-bg-primary)" : "var(--admin-text-secondary)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "live" && (
        <div className="space-y-6">
          {/* KPIs Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div
              className="rounded-lg p-4"
              style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4" style={{ color: "var(--admin-blue)" }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
                  Dividas Ativas
                </span>
              </div>
              <div className="text-xl font-bold" style={{ color: "var(--admin-text-primary)" }}>
                {reportData.totalDebts.toLocaleString("pt-BR")}
              </div>
            </div>
            <div
              className="rounded-lg p-4"
              style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4" style={{ color: "var(--admin-red)" }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
                  Valor em Aberto
                </span>
              </div>
              <div className="text-xl font-bold" style={{ color: "var(--admin-text-primary)" }}>
                {formatCurrency(reportData.totalDebtValue)}
              </div>
            </div>
            <div
              className="rounded-lg p-4"
              style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Handshake className="w-4 h-4" style={{ color: "var(--admin-orange)" }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
                  Negociacoes Ativas
                </span>
              </div>
              <div className="text-xl font-bold" style={{ color: "var(--admin-text-primary)" }}>
                {reportData.activeNegotiations}
              </div>
            </div>
            <div
              className="rounded-lg p-4"
              style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4" style={{ color: "var(--admin-green)" }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--admin-text-muted)" }}>
                  Taxa de Recuperacao
                </span>
              </div>
              <div className="text-xl font-bold" style={{ color: "var(--admin-green)" }}>
                {reportData.recoveryRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Debts by Status */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
            >
              <div
                className="px-5 py-4"
                style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}
              >
                <span className="text-[15px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                  Dividas por Status
                </span>
              </div>
              <div className="px-5 py-4 space-y-3">
                {Object.entries(reportData.debtsByStatus).map(([status, count]) => {
                  const config = statusConfig[status] || { label: status, color: "var(--admin-text-muted)", bg: "var(--admin-bg-tertiary)" }
                  const percentage = totalDebtsByStatus > 0 ? (count / totalDebtsByStatus) * 100 : 0

                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
                          {config.label}
                        </span>
                        <span className="text-sm font-bold" style={{ color: config.color }}>
                          {count}
                        </span>
                      </div>
                      <div
                        className="w-full h-2 rounded-full overflow-hidden"
                        style={{ background: "var(--admin-border)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${percentage}%`, background: config.color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent Negotiations */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
            >
              <div
                className="px-5 py-4"
                style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}
              >
                <span className="text-[15px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                  Negociacoes Recentes
                </span>
              </div>
              <div className="px-5 py-2 max-h-[300px] overflow-y-auto">
                {reportData.recentNegotiations.length === 0 ? (
                  <div className="py-8 text-center text-sm" style={{ color: "var(--admin-text-muted)" }}>
                    Nenhuma negociacao encontrada
                  </div>
                ) : (
                  reportData.recentNegotiations.map((neg) => {
                    const status = statusConfig[neg.status] || statusConfig.draft
                    return (
                      <div
                        key={neg.id}
                        className="flex items-center justify-between py-3"
                        style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}
                      >
                        <div>
                          <div className="text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
                            {formatCurrency(neg.value)}
                          </div>
                          <div className="text-xs" style={{ color: "var(--admin-text-muted)" }}>
                            {formatDate(neg.createdAt)}
                          </div>
                        </div>
                        <span
                          className="px-2 py-1 rounded-md text-[10px] font-semibold"
                          style={{ background: status.bg, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Top 10 Debtors */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
          >
            <div
              className="px-5 py-4"
              style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}
            >
              <span className="text-[15px] font-semibold" style={{ color: "var(--admin-text-primary)" }}>
                Top 10 Maiores Devedores
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}>
                    <th
                      className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      Cliente
                    </th>
                    <th
                      className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      Valor
                    </th>
                    <th
                      className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      Dias em Atraso
                    </th>
                    <th
                      className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.topDebtors.map((debtor, index) => {
                    const status = statusConfig[debtor.status] || statusConfig.em_aberto
                    return (
                      <tr
                        key={debtor.id}
                        className="transition-colors hover:bg-[var(--admin-bg-tertiary)]"
                        style={{ borderBottom: "1px solid var(--admin-bg-tertiary)" }}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{
                                background: index < 3 ? "var(--admin-gold-400)" : "var(--admin-border)",
                                color: index < 3 ? "var(--admin-bg-primary)" : "var(--admin-text-muted)"
                              }}
                            >
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium" style={{ color: "var(--admin-text-primary)" }}>
                              {debtor.name || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm font-bold" style={{ color: "var(--admin-text-primary)" }}>
                            {formatCurrency(debtor.value)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="text-sm font-bold"
                            style={{ color: getDaysColor(debtor.daysOverdue) }}
                          >
                            {debtor.daysOverdue} dias
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold"
                            style={{ background: status.bg, color: status.color }}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Daily Tab */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
          >
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: "var(--admin-text-muted)" }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--admin-text-primary)" }}>
              Relatorio Diario
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--admin-text-muted)" }}>
              Selecione uma data para visualizar o relatorio do dia
            </p>
            <input
              type="date"
              className="px-4 py-2 rounded-lg text-sm"
              style={{
                background: "var(--admin-bg-tertiary)",
                border: "1px solid var(--admin-border)",
                color: "var(--admin-text-primary)"
              }}
            />
          </div>
        </div>
      )}

      {/* Weekly Tab */}
      {activeTab === "weekly" && (
        <div className="space-y-6">
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
          >
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: "var(--admin-text-muted)" }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--admin-text-primary)" }}>
              Relatorio Semanal
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--admin-text-muted)" }}>
              Selecione uma semana para visualizar o relatorio
            </p>
            <input
              type="week"
              className="px-4 py-2 rounded-lg text-sm"
              style={{
                background: "var(--admin-bg-tertiary)",
                border: "1px solid var(--admin-border)",
                color: "var(--admin-text-primary)"
              }}
            />
          </div>
        </div>
      )}

      {/* Monthly Tab */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          <div
            className="rounded-xl p-8 text-center"
            style={{ background: "var(--admin-bg-secondary)", border: "1px solid var(--admin-border)" }}
          >
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: "var(--admin-text-muted)" }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--admin-text-primary)" }}>
              Relatorio Mensal
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--admin-text-muted)" }}>
              Selecione um mes para visualizar o relatorio
            </p>
            <input
              type="month"
              className="px-4 py-2 rounded-lg text-sm"
              style={{
                background: "var(--admin-bg-tertiary)",
                border: "1px solid var(--admin-border)",
                color: "var(--admin-text-primary)"
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
