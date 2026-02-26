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

  // Styles aligned with super-admin design system
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

    :root {
      /* Light theme - matching globals.css admin theme */
      --bg-primary: #F8F9FC;
      --bg-secondary: #FFFFFF;
      --bg-tertiary: #F1F3F9;
      --bg-elevated: #FFFFFF;
      --border-color: #E2E8F0;
      --text-primary: #1A1D27;
      --text-secondary: #4A5568;
      --text-muted: #718096;
      --gold-400: #E8950F;
      --gold-500: #D4820A;
      --gold-600: #B36D00;
      --green: #059669;
      --green-bg: rgba(5, 150, 105, 0.1);
      --red: #DC2626;
      --red-bg: rgba(220, 38, 38, 0.1);
      --blue: #2563EB;
      --blue-bg: rgba(37, 99, 235, 0.1);
      --orange: #D97706;
      --orange-bg: rgba(217, 119, 6, 0.1);
    }

    [data-theme="dark"] {
      /* Dark theme - matching globals.css admin theme */
      --bg-primary: #0F1117;
      --bg-secondary: #1A1D27;
      --bg-tertiary: #252836;
      --bg-elevated: #323647;
      --border-color: #323647;
      --text-primary: #F0F1F5;
      --text-secondary: #9DA3B7;
      --text-muted: #6B7188;
      --gold-400: #F5A623;
      --gold-500: #E8950F;
      --gold-600: #C77A00;
      --green: #2DD4A8;
      --green-bg: rgba(45, 212, 168, 0.1);
      --red: #F06868;
      --red-bg: rgba(240, 104, 104, 0.1);
      --blue: #5B8DEF;
      --blue-bg: rgba(91, 141, 239, 0.1);
      --orange: #F5A623;
      --orange-bg: rgba(245, 166, 35, 0.1);
    }

    .portal-container {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
    }

    .portal-btn {
      background: linear-gradient(135deg, var(--gold-400), var(--gold-600));
      color: #1A1D27;
      border: none;
      border-radius: 8px;
      padding: 10px 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }

    .portal-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
    }

    .portal-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .portal-btn-outline {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .portal-btn-outline:hover {
      background: var(--bg-tertiary);
      box-shadow: none;
      transform: none;
    }

    .badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    .badge-success { background: var(--green-bg); color: var(--green); }
    .badge-danger { background: var(--red-bg); color: var(--red); }
    .badge-warning { background: var(--orange-bg); color: var(--orange); }
    .badge-info { background: var(--blue-bg); color: var(--blue); }
    .badge-secondary { background: var(--bg-elevated); color: var(--text-secondary); }

    .header {
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      padding: 12px 24px;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-content {
      max-width: 1024px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--gold-400), var(--gold-600));
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-icon-inner {
      width: 20px;
      height: 20px;
      background: #1A1D27;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      color: var(--gold-400);
    }

    .logo-text {
      font-size: 18px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .logo-subtitle {
      font-size: 11px;
      color: var(--gold-400);
      font-weight: 500;
    }

    .user-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--gold-400), var(--gold-600));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      color: #1A1D27;
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .user-email {
      font-size: 12px;
      color: var(--text-muted);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }

    .summary-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
    }

    .summary-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .summary-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .summary-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .summary-icon-red { background: var(--red-bg); }
    .summary-icon-gold { background: var(--orange-bg); }
    .summary-icon-green { background: var(--green-bg); }

    .summary-value {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .summary-value.red { color: var(--red); }
    .summary-value.gold { color: var(--gold-400); }
    .summary-value.green { color: var(--green); }

    .summary-subtitle {
      font-size: 12px;
      color: var(--text-muted);
    }

    .debt-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 12px;
      transition: all 0.2s;
    }

    .debt-card:hover {
      border-color: var(--gold-400);
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
      width: 44px;
      height: 44px;
      background: var(--bg-tertiary);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      color: var(--gold-400);
    }

    .company-name {
      font-weight: 600;
      font-size: 15px;
      color: var(--text-primary);
    }

    .company-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .debt-amount {
      font-size: 22px;
      font-weight: 700;
      color: var(--red);
    }

    .debt-details {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
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
      letter-spacing: 0.3px;
    }

    .debt-detail-value {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .debt-actions {
      margin-left: auto;
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 8px 14px;
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

    .action-btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
    }

    .action-btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }

    .action-btn-secondary:hover {
      background: var(--bg-elevated);
    }

    .filter-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
    }

    .filter-tab {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      border: 1px solid transparent;
      transition: all 0.2s;
    }

    .filter-tab:hover {
      background: var(--bg-elevated);
    }

    .filter-tab.active {
      background: linear-gradient(135deg, var(--gold-400), var(--gold-600));
      color: #1A1D27;
    }

    .main-content {
      max-width: 1024px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    .welcome-section {
      margin-bottom: 32px;
    }

    .welcome-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--text-primary);
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
      color: var(--text-primary);
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-muted);
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
    }

    .theme-toggle {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 8px 12px;
      cursor: pointer;
      color: var(--text-primary);
      font-size: 16px;
      transition: all 0.2s;
    }

    .theme-toggle:hover {
      background: var(--bg-elevated);
    }

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg-primary);
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border-color);
      border-top-color: var(--gold-400);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      font-size: 14px;
      color: var(--text-muted);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
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

      .user-info {
        display: none;
      }

      .header-content {
        padding: 0 16px;
      }

      .main-content {
        padding: 24px 16px;
      }
    }
  `

  // Loading state
  if (isLoading) {
    return (
      <div className="portal-container" data-theme={theme}>
        <style>{styles}</style>
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span className="loading-text">Carregando...</span>
          </div>
        </div>
      </div>
    )
  }

  // Dashboard view (shown only when authenticated)
  if (!profile) {
    return (
      <div className="portal-container" data-theme={theme}>
        <style>{styles}</style>
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <span className="loading-text">Carregando...</span>
          </div>
        </div>
      </div>
    )
  }

  const filteredDebts = getFilteredDebts()
  const firstName = profile.full_name?.split(" ")[0] || "Usuario"
  const userInitials = profile.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U"

  return (
    <div className="portal-container" data-theme={theme}>
      <style>{styles}</style>

      {/* Header - matching super-admin design */}
      <header className="header">
        <div className="header-content">
          {/* Logo - matching super-admin sidebar logo */}
          <div className="logo-container">
            <div className="logo-icon">
              <div className="logo-icon-inner">A</div>
            </div>
            <div>
              <div className="logo-text">Altea Pay</div>
              <div className="logo-subtitle">Portal do Cliente</div>
            </div>
          </div>

          {/* User section */}
          <div className="user-section">
            <button className="theme-toggle" onClick={toggleTheme} title="Alternar tema">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <div className="user-avatar">{userInitials}</div>
            <div className="user-info">
              <span className="user-name">{profile.full_name || "Usuario"}</span>
              <span className="user-email">{profile.email}</span>
            </div>
            <button
              className="portal-btn portal-btn-outline"
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

        {/* Summary Cards - matching super-admin card style */}
        {summary && (
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-card-header">
                <span className="summary-label">Total em Aberto</span>
                <div className="summary-icon summary-icon-red">📊</div>
              </div>
              <div className="summary-value red">
                {formatCurrency(summary.overdue_amount + summary.pending_amount)}
              </div>
              <div className="summary-subtitle">
                {summary.overdue + summary.pending} divida(s)
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-header">
                <span className="summary-label">Em Negociacao</span>
                <div className="summary-icon summary-icon-gold">🤝</div>
              </div>
              <div className="summary-value gold">
                {formatCurrency(summary.negotiation_amount)}
              </div>
              <div className="summary-subtitle">
                {summary.in_negotiation} divida(s)
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-header">
                <span className="summary-label">Ja Pago</span>
                <div className="summary-icon summary-icon-green">✓</div>
              </div>
              <div className="summary-value green">
                {formatCurrency(summary.paid_amount)}
              </div>
              <div className="summary-subtitle">
                {summary.paid} divida(s)
              </div>
            </div>
          </div>
        )}

        {/* Filters - matching super-admin button style */}
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
            filteredDebts.map((debt) => {
              const badge = getStatusBadge(debt.display_status)
              const initials = debt.company_name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()

              return (
                <div key={debt.id} className="debt-card">
                  <div className="debt-card-header">
                    <div className="company-info">
                      <div className="company-avatar">{initials}</div>
                      <div>
                        <div className="company-name">{debt.company_name}</div>
                        <div className="company-desc">{debt.description}</div>
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
                        <span style={{ color: "var(--green)", fontWeight: 500, fontSize: "14px" }}>
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
