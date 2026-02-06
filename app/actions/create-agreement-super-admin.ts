"use server"

import { createAdminClient, createClient } from "@/lib/supabase/server"
import {
  getAsaasCustomerByCpfCnpj,
  createAsaasCustomer,
  updateAsaasCustomer,
} from "@/lib/asaas"

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

    // Asaas - create or get customer (optional - only if ASAAS_API_KEY is configured)
    let asaasCustomerId: string | null = null

    try {
      const existingAsaasCustomer = await getAsaasCustomerByCpfCnpj(cpfCnpj)

      if (existingAsaasCustomer) {
        asaasCustomerId = existingAsaasCustomer.id
        await updateAsaasCustomer(asaasCustomerId, {
          email: customerEmail || undefined,
          mobilePhone: customerPhone || undefined,
          notificationDisabled: true,
        })
      } else {
        const newAsaasCustomer = await createAsaasCustomer({
          name: customerName,
          cpfCnpj,
          email: customerEmail || undefined,
          mobilePhone: customerPhone || undefined,
          notificationDisabled: true,
        })
        asaasCustomerId = newAsaasCustomer.id
      }
    } catch (asaasError: any) {
      // Asaas integration is optional - if API key is not configured, continue without it
      console.warn("Asaas integration skipped (API key may not be configured):", asaasError.message)
      asaasCustomerId = null
    }

    // Save agreement
    const discountPercentage = originalAmount > 0 ? ((originalAmount - params.agreedAmount) / originalAmount) * 100 : 0
    const installmentAmount = params.agreedAmount / params.installments

    const agreementData: Record<string, any> = {
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
      payment_status: "pending",
    }

    // Only add asaas_customer_id if we got one
    if (asaasCustomerId) {
      agreementData.asaas_customer_id = asaasCustomerId
    }

    const { data: agreement, error: agreementError } = await supabase
      .from("agreements")
      .insert(agreementData)
      .select()
      .single()

    if (agreementError) throw agreementError

    return { success: true, agreement }
  } catch (error: any) {
    console.error("Error creating agreement (super admin):", error)
    return { success: false, error: error.message || "Erro desconhecido ao criar acordo", agreement: null }
  }
}
