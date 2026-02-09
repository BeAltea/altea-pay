"use server"

import { createClient } from "@/lib/supabase/server"
import {
  getAsaasCustomerByCpfCnpj,
  createAsaasCustomer,
  updateAsaasCustomer,
} from "@/lib/asaas"

export async function createAgreementWithAsaas(params: {
  vmaxId: string
  agreedAmount: number
  installments: number
  dueDate: string
  attendantName?: string
  terms?: string
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Nao autenticado")

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()
    if (!profile?.company_id) throw new Error("Empresa nao encontrada")

    const { data: vmaxRecord, error: vmaxError } = await supabase
      .from("VMAX")
      .select("*")
      .eq("id", params.vmaxId)
      .single()

    if (vmaxError || !vmaxRecord) throw new Error("Registro nao encontrado")

    const cpfCnpj = vmaxRecord["CPF/CNPJ"]?.replace(/[^\d]/g, "") || ""
    const customerName = vmaxRecord.Cliente || "Cliente"

    // Get contact info from VMAX first, then fall back to customers table
    let customerPhone = (vmaxRecord["Telefone 1"] || vmaxRecord["Telefone 2"] || vmaxRecord["Telefone"] || "").replace(/[^\d]/g, "")
    let customerEmail = vmaxRecord.Email || ""

    // If no contact info in VMAX, try to get from customers table
    if (!customerPhone || !customerEmail) {
      const { data: existingCustomerData } = await supabase
        .from("customers")
        .select("phone, email")
        .eq("document", cpfCnpj)
        .eq("company_id", profile.company_id)
        .maybeSingle()

      if (existingCustomerData) {
        if (!customerPhone && existingCustomerData.phone) {
          customerPhone = existingCustomerData.phone.replace(/[^\d]/g, "")
        }
        if (!customerEmail && existingCustomerData.email) {
          customerEmail = existingCustomerData.email
        }
      }
    }

    console.log("[ASAAS] Customer contact info:", { name: customerName, email: customerEmail, phone: customerPhone })

    let customerId: string

    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, user_id")
      .eq("document", cpfCnpj)
      .eq("company_id", profile.company_id)
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
          company_id: profile.company_id,
          source_system: "VMAX",
          external_id: params.vmaxId,
        })
        .select("id")
        .single()

      if (customerError) throw customerError
      customerId = newCustomer.id
    }

    const vencidoStr = String(vmaxRecord.Vencido || "0")
    const originalAmount = Number(vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")) || 0

    let debtId: string

    const { data: existingDebt } = await supabase
      .from("debts")
      .select("id")
      .eq("customer_id", customerId)
      .eq("company_id", profile.company_id)
      .eq("external_id", params.vmaxId)
      .maybeSingle()

    if (existingDebt) {
      debtId = existingDebt.id
    } else {
      const { data: newDebt, error: debtError } = await supabase
        .from("debts")
        .insert({
          customer_id: customerId,
          company_id: profile.company_id,
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

    // Asaas - optional integration (only if ASAAS_API_KEY is configured)
    // IMPORTANT: Do NOT send email to ASAAS - AlteaPay handles email via SendGrid/Resend
    // Only send mobilePhone so ASAAS can send WhatsApp notifications
    let asaasCustomerId: string | null = null

    try {
      const existingAsaasCustomer = await getAsaasCustomerByCpfCnpj(cpfCnpj)

      if (existingAsaasCustomer) {
        asaasCustomerId = existingAsaasCustomer.id
        // Update with phone only (NO email)
        await updateAsaasCustomer(asaasCustomerId, {
          // email: DO NOT SEND - AlteaPay handles email
          mobilePhone: customerPhone || undefined,
          notificationDisabled: false,
        })
      } else {
        // Create customer with phone only (NO email)
        const newAsaasCustomer = await createAsaasCustomer({
          name: customerName,
          cpfCnpj,
          // email: DO NOT SEND - AlteaPay handles email
          mobilePhone: customerPhone || undefined,
          notificationDisabled: false,
        })
        asaasCustomerId = newAsaasCustomer.id
      }
      console.log("[ASAAS] Customer created/updated:", asaasCustomerId, "with phone only (no email)")
    } catch (asaasError: any) {
      console.warn("Asaas integration skipped (API key may not be configured):", asaasError.message)
      asaasCustomerId = null
    }

    const discountPercentage = originalAmount > 0 ? ((originalAmount - params.agreedAmount) / originalAmount) * 100 : 0
    const installmentAmount = params.agreedAmount / params.installments

    const agreementData: Record<string, any> = {
      debt_id: debtId,
      customer_id: customerId,
      user_id: user.id,
      company_id: profile.company_id,
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
    console.error("Error creating agreement with Asaas:", error)
    return { success: false, error: error.message || "Erro desconhecido ao criar acordo", agreement: null }
  }
}
