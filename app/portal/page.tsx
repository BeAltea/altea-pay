"use client"

import { useState, useEffect } from "react"

interface PortalClient {
  id: string
  email: string
  document_type: string
  name: string | null
}

interface PortalDebt {
  id: string
  company_name: string
  company_id: string
  description: string
  amount: number
  due_date: string
  days_overdue: number
  status: string
  agreement_id?: string
  asaas_payment_url?: string
  asaas_pix_qrcode_url?: string
  asaas_boleto_url?: string
  payment_status?: string
}

type AuthMode = "login" | "signup"
type FilterStatus = "all" | "open" | "overdue" | "paid"

function formatCPF(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11)
  if (clean.length <= 3) return clean
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`
}

function formatCNPJ(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 14)
  if (clean.length <= 2) return clean
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`
}

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
  const [authMode, setAuthMode] = useState<AuthMode>("login")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Auth form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [document, setDocument] = useState("")
  const [documentType, setDocumentType] = useState<"cpf" | "cnpj">("cpf")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  // Client and debts state
  const [client, setClient] = useState<PortalClient | null>(null)
  const [debts, setDebts] = useState<PortalDebt[]>([])
  const [debtsByCompany, setDebtsByCompany] = useState<Record<string, PortalDebt[]>>({})
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")

  // Check auth on mount
  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const response = await fetch("/api/portal/debts", {
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        setClient(data.client)
        setDebts(data.debts)
        setDebtsByCompany(data.debts_by_company)
        setIsAuthenticated(true)
      }
    } catch (err) {
      // Not authenticated
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Erro ao fazer login")
        return
      }

      // Fetch debts after login
      await checkAuth()
    } catch (err) {
      setError("Erro de conexao")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/portal/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          document: document.replace(/\D/g, ""),
          document_type: documentType,
          name: name || undefined,
          phone: phone || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Erro ao criar conta")
        return
      }

      setSuccess("Conta criada com sucesso! Faca login para continuar.")
      setAuthMode("login")
      setPassword("")
    } catch (err) {
      setError("Erro de conexao")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/portal/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch (err) {
      // Ignore errors
    }

    setIsAuthenticated(false)
    setClient(null)
    setDebts([])
    setDebtsByCompany({})
    setEmail("")
    setPassword("")
  }

  function handleDocumentChange(value: string) {
    if (documentType === "cpf") {
      setDocument(formatCPF(value))
    } else {
      setDocument(formatCNPJ(value))
    }
  }

  function getFilteredDebts(): PortalDebt[] {
    if (filterStatus === "all") return debts
    if (filterStatus === "paid") {
      return debts.filter((d) => d.payment_status === "received" || d.payment_status === "completed" || d.status === "paid")
    }
    if (filterStatus === "overdue") {
      return debts.filter((d) => d.days_overdue > 0 || d.status === "overdue")
    }
    return debts.filter((d) => d.status === "open" || d.status === "pending")
  }

  function getStatusBadge(debt: PortalDebt) {
    if (debt.payment_status === "received" || debt.payment_status === "completed" || debt.status === "paid") {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Pago</span>
    }
    if (debt.days_overdue > 0 || debt.status === "overdue") {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Vencido ({debt.days_overdue}d)</span>
    }
    return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Aberto</span>
  }

  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Authenticated view - Show debts
  if (isAuthenticated && client) {
    const filteredDebts = getFilteredDebts()
    const totalAmount = debts.reduce((sum, d) => sum + d.amount, 0)
    const overdueAmount = debts.filter((d) => d.days_overdue > 0).reduce((sum, d) => sum + d.amount, 0)

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Portal do Cliente</h1>
                <p className="text-sm text-gray-600">
                  Ola, {client.name || client.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Total de Dividas</h3>
              <p className="text-2xl font-bold text-gray-900">{debts.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Valor Total</h3>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Valor Vencido</h3>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(overdueAmount)}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-2">
            {(["all", "open", "overdue", "paid"] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filterStatus === status
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {status === "all" && "Todos"}
                {status === "open" && "Abertos"}
                {status === "overdue" && "Vencidos"}
                {status === "paid" && "Pagos"}
              </button>
            ))}
          </div>

          {/* Debts by Company */}
          {Object.entries(debtsByCompany).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(debtsByCompany).map(([companyName, companyDebts]) => {
                const filteredCompanyDebts = companyDebts.filter((d) => {
                  if (filterStatus === "all") return true
                  if (filterStatus === "paid") return d.payment_status === "received" || d.payment_status === "completed" || d.status === "paid"
                  if (filterStatus === "overdue") return d.days_overdue > 0 || d.status === "overdue"
                  return d.status === "open" || d.status === "pending"
                })

                if (filteredCompanyDebts.length === 0) return null

                return (
                  <div key={companyName} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b">
                      <h2 className="text-lg font-semibold text-gray-900">{companyName}</h2>
                      <p className="text-sm text-gray-600">
                        {filteredCompanyDebts.length} divida(s)
                      </p>
                    </div>
                    <div className="divide-y">
                      {filteredCompanyDebts.map((debt) => (
                        <div key={debt.id} className="px-6 py-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{debt.description}</p>
                                {getStatusBadge(debt)}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Vencimento: {formatDate(debt.due_date)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">
                                {formatCurrency(debt.amount)}
                              </p>
                              {debt.asaas_payment_url && debt.payment_status !== "received" && (
                                <a
                                  href={debt.asaas_payment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block mt-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                                >
                                  Pagar Agora
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">Nenhuma divida encontrada</p>
            </div>
          )}
        </main>
      </div>
    )
  }

  // Auth forms
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Portal do Cliente</h1>
          <p className="text-gray-600 mt-2">Acesse suas dividas e realize pagamentos</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Tab buttons */}
          <div className="flex mb-6 border-b">
            <button
              onClick={() => { setAuthMode("login"); setError(""); setSuccess(""); }}
              className={`flex-1 pb-3 text-sm font-medium ${
                authMode === "login"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setAuthMode("signup"); setError(""); setSuccess(""); }}
              className={`flex-1 pb-3 text-sm font-medium ${
                authMode === "signup"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Criar Conta
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
              {success}
            </div>
          )}

          {authMode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="******"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Documento
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="docType"
                      value="cpf"
                      checked={documentType === "cpf"}
                      onChange={() => { setDocumentType("cpf"); setDocument(""); }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">CPF (Pessoa Fisica)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="docType"
                      value="cnpj"
                      checked={documentType === "cnpj"}
                      onChange={() => { setDocumentType("cnpj"); setDocument(""); }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">CNPJ (Pessoa Juridica)</span>
                  </label>
                </div>
              </div>
              <div>
                <label htmlFor="document" className="block text-sm font-medium text-gray-700 mb-1">
                  {documentType === "cpf" ? "CPF" : "CNPJ"}
                </label>
                <input
                  id="document"
                  type="text"
                  value={document}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                />
              </div>
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="seu@email.com"
                />
              </div>
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimo 6 caracteres"
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome (opcional)
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone (opcional)
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Criando conta..." : "Criar Conta"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by AlteaPay
        </p>
      </div>
    </div>
  )
}
