"use server"

import { createAdminClient, createClient } from "@/lib/supabase/server"

// Inline Asaas API calls - no external module dependency
const ASAAS_URL = "https://api.asaas.com/v3"

async function asaasRequest(endpoint: string, method = "GET", body?: any) {
  // Try multiple ways to read the API key
  const key = process.env.ASAAS_API_KEY 
    || process.env.NEXT_PUBLIC_ASAAS_API_KEY
    || (() => {
      try {
        // Try getConfig for serverRuntimeConfig
        const getConfig = require("next/config").default
        const config = getConfig?.()
        return config?.serverRuntimeConfig?.ASAAS_API_KEY
      } catch { return undefined }
    })()
  
  console.log("[v0] asaasRequest - key present:", !!key, "key length:", key?.length ?? 0, "endpoint:", endpoint)
  console.log("[v0] process.env.ASAAS_API_KEY:", typeof process.env.ASAAS_API_KEY, "value:", process.env.ASAAS_API_KEY ? "SET" : "UNDEFINED")
  console.log("[v0] ALL env keys with ASAAS:", Object.keys(process.env).filter(k => k.includes("ASAAS")))
  console.log("[v0] Total env keys:", Object.keys(process.env).length)
  
  if (!key) {
    const envKeys = Object.keys(process.env).sort()
    console.error("[v0] ALL ENV VARS:", envKeys.join(", "))
    throw new Error("ASAAS_API_KEY nao configurada. Total env vars: " + envKeys.length)
  }

  const res = await fetch(`${ASAAS_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "access_token": key,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error("[v0] Asaas error:", res.status, JSON.stringify(data))
    throw new Error(data.errors?.[0]?.description || `Asaas error ${res.status}`)
  }
  return data
}

export async function createAgreementSuperAdmin(params: {
  vmaxId: string
  companyId: string
  agreedAmount: number
  installments: number
  dueDate: string
  attendantName?: string
  terms?: string
}) {
  try {
    // Verify user is super admin
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) throw new Error("Nao autenticado")

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") throw new Error("Sem permissao")

    // Use admin client to bypass RLS
    const supabase = createAdminClient()

    // Get VMAX record
    const { data: vmaxRecord, error: vmaxError } = await supabase
      .from("VMAX")
      .select("*")
      .eq("id", params.vmaxId)
      .single()

    if (vmaxError || !vmaxRecord) {
      throw new Error("Registro nao encontrado")
    }

    const cpfCnpj = vmaxRecord["CPF/CNPJ"]?.replace(/[^\d]/g, "") || ""
    const customerName = vmaxRecord.Cliente || "Cliente"
    const customerPhone = (vmaxRecord["Telefone 1"] || vmaxRecord["Telefone 2"] || "").replace(/[^\d]/g, "")
    const customerEmail = vmaxRecord.Email || ""

    // Create or get customer in DB
    let customerId: string

    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("document", cpfCnpj)
      .eq("company_id", params.companyId)
      .maybeSingle()

    if (existingCustomer) {
      customerId = existingCustomer.id
      await supabase
        .from("customers")
        .update({ name: customerName, phone: customerPhone, email: customerEmail })
        .eq("id", existingCustomer.id)
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: customerName,
          document: cpfCnpj,
          document_type: cpfCnpj.length === 11 ? "CPF" : "CNPJ",
          phone: customerPhone,
          email: customerEmail,
          company_id: params.companyId,
          source_system: "VMAX",
          external_id: params.vmaxId,
        })
        .select("id")
        .single()

      if (customerError) throw customerError
      customerId = newCustomer.id
    }

    // Parse debt amount
    const vencidoStr = String(vmaxRecord.Vencido || "0")
    const originalAmount = Number(vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")) || 0

    // Create or get debt
    let debtId: string

    const { data: existingDebt } = await supabase
      .from("debts")
      .select("id")
      .eq("customer_id", customerId)
      .eq("company_id", params.companyId)
      .eq("external_id", params.vmaxId)
      .maybeSingle()

    if (existingDebt) {
      debtId = existingDebt.id
    } else {
      const { data: newDebt, error: debtError } = await supabase
        .from("debts")
        .insert({
          customer_id: customerId,
          company_id: params.companyId,
          amount: originalAmount,
          due_date: params.dueDate,
          description: `Divida de ${customerName}`,
          status: "in_negotiation",
          source_system: "VMAX",
          external_id: params.vmaxId,
        })
        .select("id")
        .single()

      if (debtError) throw debtError
      debtId = newDebt.id
    }

    // Asaas - create or get customer (INLINE, no lib import)
    let asaasCustomerId: string

    const searchData = await asaasRequest(`/customers?cpfCnpj=${cpfCnpj}`)
    const existingAsaasCustomer = searchData.data?.[0] || null

    if (existingAsaasCustomer) {
      asaasCustomerId = existingAsaasCustomer.id
      await asaasRequest(`/customers/${asaasCustomerId}`, "PUT", {
        email: customerEmail || undefined,
        mobilePhone: customerPhone || undefined,
        notificationDisabled: true,
      })
    } else {
      const newAsaasCustomer = await asaasRequest("/customers", "POST", {
        name: customerName,
        cpfCnpj,
        email: customerEmail || undefined,
        mobilePhone: customerPhone || undefined,
        notificationDisabled: true,
      })
      asaasCustomerId = newAsaasCustomer.id
    }

    // Save agreement
    const discountPercentage = ((originalAmount - params.agreedAmount) / originalAmount) * 100
    const installmentAmount = params.agreedAmount / params.installments

    const { data: agreement, error: agreementError } = await supabase
      .from("agreements")
      .insert({
        debt_id: debtId,
        customer_id: customerId,
        user_id: user.id,
        company_id: params.companyId,
        original_amount: originalAmount,
        agreed_amount: params.agreedAmount,
        discount_amount: originalAmount - params.agreedAmount,
        discount_percentage: discountPercentage,
        installments: params.installments,
        installment_amount: installmentAmount,
        due_date: params.dueDate,
        status: "draft",
        attendant_name: params.attendantName,
        terms: params.terms,
        asaas_customer_id: asaasCustomerId,
        payment_status: "pending",
      })
      .select()
      .single()

    if (agreementError) throw agreementError

    return { success: true, agreement }
  } catch (error) {
    console.error("Error creating agreement (super admin):", error)
    throw error
  }
}
