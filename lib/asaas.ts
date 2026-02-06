/**
 * Asaas Payment Gateway Integration - v7 FINAL
 * 
 * Flow:
 * 1. Read ASAAS_API_KEY from process.env INSIDE each function call (not at module level)
 * 2. If available, call Asaas API directly
 * 3. If not available, fallback to /api/asaas proxy route
 * 
 * Last updated: 2026-02-06 - Fixed env var reading to happen at runtime
 */

const ASAAS_BASE = "https://api.asaas.com/v3"

// ====== Types ======

export interface AsaasCustomer {
  id: string
  name: string
  email?: string
  phone?: string
  mobilePhone?: string
  cpfCnpj: string
  postalCode?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  notificationDisabled?: boolean
}

export interface AsaasPayment {
  id: string
  customer: string
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED"
  value: number
  dueDate: string
  description?: string
  externalReference?: string
  installmentCount?: number
  installmentValue?: number
  invoiceUrl?: string
  bankSlipUrl?: string
  transactionReceiptUrl?: string
  pixQrCodeUrl?: string
  status: string
}

export interface CreatePaymentParams {
  customer: string
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED"
  value: number
  dueDate: string
  description?: string
  externalReference?: string
  installmentCount?: number
  installmentValue?: number
  postalService?: boolean
}

// ====== Internal API Proxy Helper ======

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

async function fetchViaProxy(endpoint: string, method: string, body?: unknown): Promise<unknown> {
  const baseUrl = getAppBaseUrl()
  
  let res: Response
  try {
    res = await fetch(`${baseUrl}/api/asaas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        method,
        data: body,
      }),
    })
  } catch (fetchError: any) {
    throw new Error(`Falha ao conectar com proxy Asaas: ${fetchError.message}`)
  }

  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    const text = await res.text()
    console.error("Asaas proxy returned non-JSON response:", text.substring(0, 200))
    throw new Error("ASAAS_API_KEY nao configurada. Adicione a chave nas variaveis de ambiente do projeto.")
  }

  const json = await res.json()

  if (!res.ok) {
    const msg = json.error || json.errors?.[0]?.description || `Asaas proxy error (${res.status})`
    throw new Error(msg)
  }

  return json
}

async function fetchDirect(endpoint: string, apiKey: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(`${ASAAS_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(options?.headers ?? {}),
    },
  })

  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    const text = await res.text()
    console.error("Asaas API returned non-JSON:", res.status, text.substring(0, 200))
    throw new Error(`Asaas API retornou resposta invalida (${res.status}). Verifique a ASAAS_API_KEY.`)
  }

  const json = await res.json()

  if (!res.ok) {
    const msg = json.errors?.[0]?.description || `Asaas API error (${res.status})`
    console.error("Asaas direct API error:", res.status, JSON.stringify(json))
    throw new Error(msg)
  }

  return json
}

// ====== Main API Caller ======

async function asaasRequest(endpoint: string, method = "GET", body?: unknown): Promise<any> {
  // IMPORTANT: Read key inside function, NOT at module level
  // Module-level reads get cached at build time and may be empty
  const key = process.env.ASAAS_API_KEY?.trim()

  console.log("[v0] asaasRequest called - endpoint:", endpoint, "- key exists:", !!key, "- key length:", key?.length || 0)

  if (key && key.length > 0) {
    const opts: RequestInit = { method }
    if (body) {
      opts.body = JSON.stringify(body)
    }
    return fetchDirect(endpoint, key, opts)
  }

  // Fallback: Use proxy route which reads env vars at request time
  console.warn("[v0] ASAAS_API_KEY not found in process.env, falling back to /api/asaas proxy")
  return fetchViaProxy(endpoint, method, body)
}

// ====== Customer Functions ======

export async function createAsaasCustomer(params: {
  name: string
  cpfCnpj: string
  email?: string
  phone?: string
  mobilePhone?: string
  postalCode?: string
  address?: string
  addressNumber?: string
  notificationDisabled?: boolean
}): Promise<AsaasCustomer> {
  return asaasRequest("/customers", "POST", params)
}

export async function getAsaasCustomerByCpfCnpj(
  cpfCnpj: string
): Promise<AsaasCustomer | null> {
  const data: any = await asaasRequest(`/customers?cpfCnpj=${cpfCnpj}`)
  return data.data?.[0] || null
}

export async function updateAsaasCustomer(
  customerId: string,
  params: {
    notificationDisabled?: boolean
    email?: string
    mobilePhone?: string
  }
): Promise<AsaasCustomer> {
  return asaasRequest(`/customers/${customerId}`, "PUT", params)
}

// ====== Payment Functions ======

export async function createAsaasPayment(
  params: CreatePaymentParams
): Promise<AsaasPayment> {
  return asaasRequest("/payments", "POST", params)
}

export async function getAsaasPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasRequest(`/payments/${paymentId}`)
}

export async function getAsaasPaymentByExternalReference(
  externalReference: string
): Promise<AsaasPayment | null> {
  const data: any = await asaasRequest(
    `/payments?externalReference=${externalReference}`
  )
  return data.data?.[0] || null
}

// ====== Notification Functions ======

export async function getAsaasCustomerNotifications(
  customerId: string
): Promise<any[]> {
  const data: any = await asaasRequest(`/customers/${customerId}/notifications`)
  return data.data || []
}

export async function updateAsaasNotification(
  notificationId: string,
  params: {
    enabled?: boolean
    emailEnabledForCustomer?: boolean
    smsEnabledForCustomer?: boolean
    whatsappEnabledForCustomer?: boolean
  }
): Promise<any> {
  return asaasRequest(`/notifications/${notificationId}`, "PUT", params)
}

export async function sendAsaasNotification(
  customerId: string,
  channel: "email" | "sms" | "whatsapp"
): Promise<void> {
  const notifications = await getAsaasCustomerNotifications(customerId)

  const paymentCreatedNotification = notifications.find(
    (n: any) => n.event === "PAYMENT_CREATED"
  )

  if (paymentCreatedNotification) {
    await updateAsaasNotification(paymentCreatedNotification.id, {
      enabled: true,
      emailEnabledForCustomer: channel === "email",
      smsEnabledForCustomer: channel === "sms",
      whatsappEnabledForCustomer: channel === "whatsapp",
    })
  }
}

export async function resendAsaasPaymentNotification(
  paymentId: string
): Promise<any> {
  return asaasRequest(`/payments/${paymentId}/resendNotification`, "POST", {})
}
