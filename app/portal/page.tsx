"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"

// Types
interface Profile {
  id: string
  email: string
  full_name: string
  document_type: string
  document_number: string
}

interface Debt {
  id: string
  client_name: string
  company_id: string
  company_name: string
  description: string
  amount: number
  due_date: string
  days_overdue: number
  display_status: string
  asaas_status: string | null
  invoice_url: string | null
  bankslip_url: string | null
  pix_qrcode: string | null
  agreement_id: string | null
  agreement_status: string | null
  source: string
}

interface Summary {
  total: number
  total_amount: number
  overdue: number
  overdue_amount: number
  pending: number
  pending_amount: number
  paid: number
  paid_amount: number
  in_negotiation: number
  negotiation_amount: number
  companies_count: number
}

type Theme = "dark" | "light"

// Format helpers
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString("pt-BR")
  } catch {
    return dateStr
  }
}

export default function PortalPage() {
  const router = useRouter()
  const [theme, setTheme] = useState<Theme>("dark")
  const [isLoading, setIsLoading] = useState(true)

  // Dashboard state
  const [profile, setProfile] = useState<Profile | null>(null)
  const [debts, setDebts] = useState<Debt[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [filter, setFilter] = useState<"all" | "overdue" | "pending" | "paid">("all")

  // Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Check auth on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("portal-theme") as Theme
    if (savedTheme) setTheme(savedTheme)
    checkAuth()
  }, [])

  async function checkAuth() {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await fetchDebts()
      } else {
        // Redirect to login if not authenticated
        router.push("/")
      }
    } catch (err) {
      console.error("Auth check error:", err)
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchDebts() {
    try {
      const response = await fetch("/api/portal/debts", { credentials: "include" })
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
        setDebts(data.all_debts || [])
        setSummary(data.summary)
      } else if (response.status === 401) {
        router.push("/")
      }
    } catch (err) {
      console.error("Fetch debts error:", err)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/")
  }

  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    localStorage.setItem("portal-theme", newTheme)
  }

  function getFilteredDebts(): Debt[] {
    if (filter === "all") return debts
    return debts.filter((d) => d.display_status === filter)
  }

  function getStatusBadge(status: string) {
    const badges: Record<string, { class: string; text: string }> = {
      paid: { class: "badge-success", text: "Pago" },
      overdue: { class: "badge-danger", text: "Vencido" },
      pending: { class: "badge-warning", text: "Pendente" },
      negotiation: { class: "badge-info", text: "Em Negociacao" },
    }
    return badges[status] || { class: "badge-secondary", text: status }
  }

  // Styles
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');

    :root {
      --dark-900: #0F1117;
      --dark-800: #1A1D27;
      --dark-700: #252836;
      --dark-600: #353849;
      --gold-400: #F5A623;
      --gold-500: #E8950F;
      --gold-600: #C77A00;
      --green: #2DD4A8;
      --red: #F06868;
      --blue: #5B8DEF;
      --orange: #F5A623;
      --text-primary: #FFFFFF;
      --text-secondary: #B8BCC8;
      --text-muted: #6B7188;
    }

    [data-theme="light"] {
      --dark-900: #F5F6FA;
      --dark-800: #FFFFFF;
      --dark-700: #F0F1F5;
      --dark-600: #E2E4EC;
      --text-primary: #1A1D27;
      --text-secondary: #6B7188;
      --text-muted: #9DA3B7;
    }

    .portal-container {
      font-family: 'DM Sans', sans-serif;
      background: var(--dark-900);
      color: var(--text-primary);
      min-height: 100vh;
    }

    .portal-btn {
      background: linear-gradient(135deg, var(--gold-400), var(--gold-600));
      color: #1A1D27;
      border: none;
      border-radius: 8px;
      padding: 14px 24px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      font-size: 14px;
    }

    .portal-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 166, 35, 0.3);
    }

    .portal-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .portal-btn-outline {
      background: transparent;
      border: 1px solid var(--dark-600);
      color: var(--text-primary);
    }

    .portal-btn-outline:hover {
      background: var(--dark-700);
      box-shadow: none;
    }

    .badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    .badge-success { background: rgba(45, 212, 168, 0.15); color: var(--green); }
    .badge-danger { background: rgba(240, 104, 104, 0.15); color: var(--red); }
    .badge-warning { background: rgba(245, 166, 35, 0.15); color: var(--orange); }
    .badge-info { background: rgba(91, 141, 239, 0.15); color: var(--blue); }
    .badge-secondary { background: var(--dark-600); color: var(--text-secondary); }

    .header {
      background: var(--dark-800);
      border-bottom: 1px solid var(--dark-600);
      padding: 16px 24px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-content {
      max-width: 960px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      font-weight: 700;
      color: var(--gold-400);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .summary-card {
      background: var(--dark-800);
      border: 1px solid var(--dark-600);
      border-radius: 14px;
      padding: 20px;
      text-align: center;
    }

    .summary-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .summary-value {
      font-size: 28px;
      font-weight: 700;
    }

    .summary-value.red { color: var(--red); }
    .summary-value.gold { color: var(--gold-400); }
    .summary-value.green { color: var(--green); }

    .debt-card {
      background: var(--dark-800);
      border: 1px solid var(--dark-600);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 16px;
      animation: fadeUp 0.3s ease-out;
    }

    .debt-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .company-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .company-avatar {
      width: 48px;
      height: 48px;
      background: var(--dark-700);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: var(--gold-400);
    }

    .debt-amount {
      font-size: 24px;
      font-weight: 700;
      color: var(--red);
    }

    .debt-details {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid var(--dark-600);
    }

    .debt-detail {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .debt-detail-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .debt-detail-value {
      font-size: 14px;
      font-weight: 500;
    }

    .debt-actions {
      margin-left: auto;
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      display: flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
    }

    .action-btn-primary {
      background: linear-gradient(135deg, var(--gold-400), var(--gold-600));
      color: #1A1D27;
    }

    .action-btn-secondary {
      background: var(--dark-700);
      color: var(--text-primary);
    }

    .filter-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
    }

    .filter-tab {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      background: var(--dark-700);
      color: var(--text-secondary);
      border: 1px solid transparent;
      transition: all 0.2s;
    }

    .filter-tab.active {
      background: var(--gold-400);
      color: #1A1D27;
    }

    .main-content {
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    .welcome-section {
      margin-bottom: 32px;
    }

    .welcome-title {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .welcome-subtitle {
      color: var(--text-secondary);
      font-size: 14px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted);
    }

    @keyframes fadeUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }

      .debt-details {
        flex-direction: column;
        align-items: flex-start;
      }

      .debt-actions {
        margin-left: 0;
        margin-top: 16px;
        width: 100%;
        flex-direction: column;
      }

      .action-btn {
        width: 100%;
        justify-content: center;
      }
    }

    .theme-toggle {
      background: var(--dark-700);
      border: 1px solid var(--dark-600);
      border-radius: 8px;
      padding: 8px 12px;
      cursor: pointer;
      color: var(--text-primary);
      font-size: 16px;
    }

    .loading-spinner {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--dark-600);
      border-top-color: var(--gold-400);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `

  // Loading state
  if (isLoading) {
    return (
      <div className="portal-container" data-theme={theme}>
        <style>{styles}</style>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  // Dashboard view (shown only when authenticated)
  if (!profile) {
    return (
      <div className="portal-container" data-theme={theme}>
        <style>{styles}</style>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  const filteredDebts = getFilteredDebts()
  const firstName = profile.full_name?.split(" ")[0] || "Usuario"

  return (
    <div className="portal-container" data-theme={theme}>
      <style>{styles}</style>

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">AlteaPay</div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
              {profile.email}
            </span>
            <button
              className="portal-btn portal-btn-outline"
              style={{ width: "auto", padding: "8px 16px" }}
              onClick={handleLogout}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Welcome */}
        <section className="welcome-section">
          <h1 className="welcome-title">Ola, {firstName}!</h1>
          <p className="welcome-subtitle">
            Confira suas dividas e realize pagamentos
          </p>
        </section>

        {/* Summary */}
        {summary && (
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">Total em Aberto</div>
              <div className="summary-value red">
                {formatCurrency(summary.overdue_amount + summary.pending_amount)}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                {summary.overdue + summary.pending} divida(s)
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Em Negociacao</div>
              <div className="summary-value gold">
                {formatCurrency(summary.negotiation_amount)}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                {summary.in_negotiation} divida(s)
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Ja Pago</div>
              <div className="summary-value green">
                {formatCurrency(summary.paid_amount)}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                {summary.paid} divida(s)
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filter-tabs">
          {[
            { key: "all", label: "Todas" },
            { key: "overdue", label: "Vencidas" },
            { key: "pending", label: "Pendentes" },
            { key: "paid", label: "Pagas" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`filter-tab ${filter === tab.key ? "active" : ""}`}
              onClick={() => setFilter(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Debts Section */}
        <section>
          <h2 className="section-title">Minhas Dividas</h2>

          {filteredDebts.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma divida encontrada</p>
            </div>
          ) : (
            filteredDebts.map((debt, index) => {
              const badge = getStatusBadge(debt.display_status)
              const initials = debt.company_name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()

              return (
                <div
                  key={debt.id}
                  className="debt-card"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="debt-card-header">
                    <div className="company-info">
                      <div className="company-avatar">{initials}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{debt.company_name}</div>
                        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                          {debt.description}
                        </div>
                      </div>
                    </div>
                    <div className="debt-amount">{formatCurrency(debt.amount)}</div>
                  </div>

                  <div className="debt-details">
                    <div className="debt-detail">
                      <span className="debt-detail-label">Vencimento</span>
                      <span className="debt-detail-value">{formatDate(debt.due_date)}</span>
                    </div>

                    {debt.days_overdue > 0 && (
                      <div className="debt-detail">
                        <span className="debt-detail-label">Dias em Atraso</span>
                        <span className="debt-detail-value" style={{ color: "var(--red)" }}>
                          {debt.days_overdue} dias
                        </span>
                      </div>
                    )}

                    <span className={`badge ${badge.class}`}>{badge.text}</span>

                    <div className="debt-actions">
                      {debt.invoice_url && debt.display_status !== "paid" && (
                        <a
                          href={debt.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn action-btn-primary"
                        >
                          Ver Fatura
                        </a>
                      )}
                      {debt.bankslip_url && debt.display_status !== "paid" && (
                        <a
                          href={debt.bankslip_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn action-btn-secondary"
                        >
                          Boleto
                        </a>
                      )}
                      {!debt.invoice_url && !debt.bankslip_url && debt.display_status !== "paid" && (
                        <button className="action-btn action-btn-secondary" disabled>
                          Negociar
                        </button>
                      )}
                      {debt.display_status === "paid" && (
                        <span style={{ color: "var(--green)", fontWeight: 500 }}>
                          Pago
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}
