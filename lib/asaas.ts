/**
 * Asaas Payment Gateway Integration - v5
 * Uses internal API route proxy to access ASAAS_API_KEY
 * This avoids issues with process.env not being available in Server Actions
 */

const ASAAS_BASE_URL = "https://api.asaas.com/v3"

// --- Types ---

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

// --- Core fetch helper ---
// Tries direct process.env first, falls back to internal API route proxy

async function callAsaasApi(endpoint: string, options?: RequestInit) {
  // Try reading API key directly first
  const apiKey = process.env.ASAAS_API_KEY

  if (apiKey && apiKey.trim() !== "") {
    // Direct call - API key available in this runtime context
    const url = `${ASAAS_BASE_URL}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey.trim(),
        ...(options?.headers ?? {}),
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Asaas API error:", response.status, JSON.stringify(data))
      throw new Error(data.errors?.[0]?.description || `Asaas API error (${response.status})`)
    }

    return data
  }

  // Fallback: API key not available in this context, use internal proxy route
  // Determine base URL for internal API call
  let appUrl = "http://localhost:3000"
  if (process.env.NEXT_PUBLIC_APP_URL) {
    appUrl = process.env.NEXT_PUBLIC_APP_URL
  } else if (process.env.VERCEL_URL) {
    appUrl = `https://${process.env.VERCEL_URL}`
  }
  
  const method = options?.method || "GET"
  let bodyData: any = undefined
  if (options?.body) {
    try {
      bodyData = JSON.parse(options.body as string)
    } catch {
      bodyData = options.body
    }
  }

  const proxyResponse = await fetch(`${appUrl}/api/asaas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint,
      method,
      data: bodyData,
    }),
  })

  const proxyData = await proxyResponse.json()

  if (!proxyResponse.ok) {
    throw new Error(proxyData.error || `Asaas proxy error (${proxyResponse.status})`)
  }

  return proxyData
}

// --- Customer functions ---

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
  return callAsaasApi("/customers", {
    method: "POST",
    body: JSON.stringify(params),
  })
}

export async function getAsaasCustomerByCpfCnpj(
  cpfCnpj: string
): Promise<AsaasCustomer | null> {
  const data = await callAsaasApi(`/customers?cpfCnpj=${cpfCnpj}`)
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
  return callAsaasApi(`/customers/${customerId}`, {
    method: "PUT",
    body: JSON.stringify(params),
  })
}

// --- Payment functions ---

export async function createAsaasPayment(
  params: CreatePaymentParams
): Promise<AsaasPayment> {
  return callAsaasApi("/payments", {
    method: "POST",
    body: JSON.stringify(params),
  })
}

export async function getAsaasPayment(paymentId: string): Promise<AsaasPayment> {
  return callAsaasApi(`/payments/${paymentId}`)
}

export async function getAsaasPaymentByExternalReference(
  externalReference: string
): Promise<AsaasPayment | null> {
  const data = await callAsaasApi(
    `/payments?externalReference=${externalReference}`
  )
  return data.data?.[0] || null
}

// --- Notification functions ---

export async function getAsaasCustomerNotifications(
  customerId: string
): Promise<any[]> {
  const data = await callAsaasApi(`/customers/${customerId}/notifications`)
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
  return callAsaasApi(`/notifications/${notificationId}`, {
    method: "PUT",
    body: JSON.stringify(params),
  })
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
  return callAsaasApi(`/payments/${paymentId}/resendNotification`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}
