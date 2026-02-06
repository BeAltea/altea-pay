/**
 * Asaas Payment Gateway - Direct API calls
 * 
 * Reads ASAAS_API_KEY from process.env at CALL TIME (not module level).
 * Calls https://api.asaas.com/v3 directly. No proxy, no middleware.
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

// ====== Core API Function ======

function getApiKey(): string {
  const key = process.env.ASAAS_API_KEY?.trim()
  console.log("[v0] getApiKey called - key exists:", !!key, "key length:", key?.length || 0)
  if (!key) {
    // Log ALL env var keys that contain "ASAAS" for debugging
    const allKeys = Object.keys(process.env)
    const asaasKeys = allKeys.filter(k => k.toUpperCase().includes("ASAAS"))
    console.log("[v0] Env vars with ASAAS:", asaasKeys.join(", ") || "NONE FOUND")
    console.log("[v0] Total env vars:", allKeys.length)
    throw new Error("ASAAS_API_KEY_NOT_SET")
  }
  return key
}

async function asaasRequest(endpoint: string, method = "GET", body?: unknown): Promise<any> {
  const apiKey = getApiKey()
  
  const url = `${ASAAS_BASE}${endpoint}`
  console.log("[v0] asaasRequest:", method, endpoint)

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "access_token": apiKey,
    },
    cache: "no-store",
  }

  if (body && method !== "GET") {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url, options)

  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    const text = await res.text()
    console.error("[v0] Asaas returned non-JSON:", res.status, text.substring(0, 200))
    throw new Error(`Asaas API retornou resposta invalida (${res.status})`)
  }

  const json = await res.json()

  if (!res.ok) {
    const msg = json.errors?.[0]?.description || json.error || `Erro Asaas (${res.status})`
    console.error("[v0] Asaas API error:", res.status, JSON.stringify(json))
    throw new Error(msg)
  }

  return json
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
