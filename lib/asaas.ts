/**
 * Asaas Payment Gateway - ALL calls go through /api/asaas route
 * 
 * Server Actions CANNOT read process.env in v0 preview.
 * API Routes CAN read process.env.
 * 
 * Solution: Every function here calls /api/asaas (API Route) which
 * reads ASAAS_API_KEY and forwards the request to Asaas.
 * 
 * The host URL is obtained from next/headers to ensure it works
 * in any environment (v0 preview, Vercel, localhost).
 */

import { headers } from "next/headers"

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
  /**
   * CRITICAL: This MUST always be false.
   * AlteaPay handles ALL email notifications via SendGrid queue.
   * ASAAS should NEVER send email notifications.
   */
  emailNotificationEnabled?: boolean
}

// ====== Core: Call /api/asaas route ======

async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers()
    const host = h.get("host")
    const proto = h.get("x-forwarded-proto") || "https"
    if (host) {
      return `${proto}://${host}`
    }
  } catch {
    // headers() not available (e.g. called outside request context)
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

async function asaasRequest(endpoint: string, method = "GET", body?: unknown): Promise<any> {
  const baseUrl = await getBaseUrl()
  const url = `${baseUrl}/api/asaas`

  console.log("[v0] asaasRequest via proxy:", method, endpoint, "baseUrl:", baseUrl)

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint,
      method,
      data: body,
    }),
    cache: "no-store",
  })

  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    const text = await res.text()
    console.error("[v0] Proxy returned non-JSON:", res.status, text.substring(0, 300))
    throw new Error(`Erro interno do servidor ao acessar Asaas (status ${res.status}). Verifique se o projeto foi deployado corretamente.`)
  }

  const json = await res.json()

  if (!res.ok) {
    const msg = json.error || json.errors?.[0]?.description || `Erro Asaas (${res.status})`
    console.error("[v0] Proxy error response:", res.status, JSON.stringify(json))
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
  province?: string
  notificationDisabled?: boolean
  externalReference?: string
}): Promise<AsaasCustomer> {
  // Remove undefined/empty values before sending
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
  )
  return asaasRequest("/customers", "POST", cleanParams)
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
    name?: string
    email?: string
    phone?: string
    mobilePhone?: string
    postalCode?: string
    address?: string
    addressNumber?: string
    province?: string
    notificationDisabled?: boolean
    externalReference?: string
  }
): Promise<AsaasCustomer> {
  // Remove undefined values before sending
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
  )
  return asaasRequest(`/customers/${customerId}`, "PUT", cleanParams)
}

// ====== Payment Functions ======

export async function createAsaasPayment(
  params: CreatePaymentParams
): Promise<AsaasPayment> {
  // CRITICAL: ALWAYS set emailNotificationEnabled to false
  // AlteaPay handles ALL email notifications via SendGrid queue
  // ASAAS should NEVER send email notifications
  const safeParams = {
    ...params,
    emailNotificationEnabled: false,
    postalService: false,
  }
  return asaasRequest("/payments", "POST", safeParams)
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
