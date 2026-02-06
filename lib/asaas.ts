/**
 * Asaas Payment Gateway Integration - v8 DEFINITIVE
 * 
 * ALL calls go through the /api/asaas API Route.
 * Server Actions CANNOT read process.env reliably in all environments.
 * The API Route CAN always read process.env.ASAAS_API_KEY.
 * 
 * This file is a thin wrapper that calls /api/asaas for every operation.
 */

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

// ====== Internal: Always call via API Route ======

function getAppBaseUrl(): string {
  // In server context, use internal URL patterns
  if (typeof window === "undefined") {
    // VERCEL_URL is always available in Vercel deployments (including preview)
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL
    }
    // For local development
    return `http://localhost:${process.env.PORT || 3000}`
  }
  // In browser context, use relative URL
  return ""
}

async function asaasRequest(endpoint: string, method = "GET", body?: unknown): Promise<any> {
  const baseUrl = getAppBaseUrl()
  const url = `${baseUrl}/api/asaas`

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        method,
        data: body,
      }),
      // Ensure no caching
      cache: "no-store",
    })
  } catch (fetchError: any) {
    console.error("[asaas] Failed to reach /api/asaas:", fetchError.message)
    throw new Error(
      "Nao foi possivel conectar ao servico de pagamentos. Verifique se o servidor esta rodando."
    )
  }

  // Check if response is JSON
  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    const text = await res.text()
    console.error("[asaas] /api/asaas returned non-JSON:", res.status, text.substring(0, 300))
    throw new Error(
      "ASAAS_API_KEY nao esta configurada ou o servidor retornou uma resposta invalida. Verifique as variaveis de ambiente."
    )
  }

  const json = await res.json()

  if (!res.ok) {
    const msg =
      json.error ||
      json.errors?.[0]?.description ||
      `Erro na API do Asaas (${res.status})`
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
