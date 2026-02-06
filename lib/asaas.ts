/**
 * Asaas Payment Gateway Integration - v4
 * All functions read process.env.ASAAS_API_KEY at runtime (never cached at module level)
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

async function callAsaasApi(endpoint: string, options?: RequestInit) {
  // ALWAYS read from process.env at call time - never cache this
  const apiKey = process.env.ASAAS_API_KEY

  console.log("[v0] callAsaasApi - ASAAS_API_KEY present:", !!apiKey, "len:", apiKey?.length ?? 0)

  if (!apiKey || apiKey.trim() === "") {
    const envKeys = Object.keys(process.env).filter(
      (k) => k.startsWith("ASAAS") || k.startsWith("NEXT_PUBLIC_SUPABASE")
    )
    console.error("[v0] ASAAS_API_KEY NOT FOUND. Available related keys:", envKeys.join(", "))
    throw new Error(
      "ASAAS_API_KEY environment variable is not configured. Please add it to your project settings."
    )
  }

  const url = `${ASAAS_BASE_URL}${endpoint}`
  console.log("[v0] Calling Asaas:", options?.method ?? "GET", url)

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
    console.error("[v0] Asaas API error:", response.status, JSON.stringify(data))
    throw new Error(data.errors?.[0]?.description || `Asaas API error (${response.status})`)
  }

  return data
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
  console.log("[v0] Creating Asaas customer:", params.cpfCnpj)
  return callAsaasApi("/customers", {
    method: "POST",
    body: JSON.stringify(params),
  })
}

export async function getAsaasCustomerByCpfCnpj(
  cpfCnpj: string
): Promise<AsaasCustomer | null> {
  console.log("[v0] Searching Asaas customer by CPF/CNPJ:", cpfCnpj)
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
  console.log("[v0] Updating Asaas customer:", customerId, params)
  return callAsaasApi(`/customers/${customerId}`, {
    method: "PUT",
    body: JSON.stringify(params),
  })
}

// --- Payment functions ---

export async function createAsaasPayment(
  params: CreatePaymentParams
): Promise<AsaasPayment> {
  console.log("[v0] Creating Asaas payment:", JSON.stringify(params))
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
