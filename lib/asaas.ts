"use server"

const ASAAS_API_URL = "https://api.asaas.com/v3"
const ASAAS_API_KEY = process.env.ASAAS_API_KEY

if (!ASAAS_API_KEY) {
  throw new Error("ASAAS_API_KEY environment variable is required")
}

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

async function asaasFetch(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY!,
      ...options?.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    console.error("[v0] Asaas API error:", data)
    throw new Error(data.errors?.[0]?.description || "Asaas API error")
  }

  return data
}

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

  return asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify(params),
  })
}

export async function getAsaasCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
  console.log("[v0] Searching Asaas customer by CPF/CNPJ:", cpfCnpj)

  const data = await asaasFetch(`/customers?cpfCnpj=${cpfCnpj}`)

  return data.data?.[0] || null
}

export async function createAsaasPayment(params: CreatePaymentParams): Promise<AsaasPayment> {
  console.log("[v0] Creating Asaas payment:", params)

  return asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify(params),
  })
}

export async function updateAsaasCustomer(customerId: string, params: {
  notificationDisabled?: boolean
  email?: string
  mobilePhone?: string
}): Promise<AsaasCustomer> {
  console.log("[v0] Updating Asaas customer:", customerId, params)

  return asaasFetch(`/customers/${customerId}`, {
    method: "PUT",
    body: JSON.stringify(params),
  })
}

export async function getAsaasPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch(`/payments/${paymentId}`)
}

export async function getAsaasPaymentByExternalReference(externalReference: string): Promise<AsaasPayment | null> {
  const data = await asaasFetch(`/payments?externalReference=${externalReference}`)

  return data.data?.[0] || null
}
