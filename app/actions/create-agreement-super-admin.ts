"use server"

import { createAdminClient, createClient } from "@/lib/supabase/server"
import { createAsaasCustomer, createAsaasPayment, getAsaasCustomerByCpfCnpj, updateAsaasCustomer } from "@/lib/asaas"

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

    // Create or get customer
    let customerId: string

    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("document", cpfCnpj)
      .eq("company_id", params.companyId)
      .maybeSingle()

    if (existingCustomer) {
      customerId = existingCustomer.id
      // Atualizar dados do customer com dados frescos da VMAX
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

    // Asaas customer
    let asaasCustomerId: string

    const existingAsaasCustomer = await getAsaasCustomerByCpfCnpj(cpfCnpj)
    if (existingAsaasCustomer) {
      asaasCustomerId = existingAsaasCustomer.id
      // SEMPRE desabilitar notificacoes no cliente existente para evitar envio automatico
      await updateAsaasCustomer(asaasCustomerId, { notificationDisabled: true })
    } else {
      const asaasCustomer = await createAsaasCustomer({
        name: customerName,
        cpfCnpj: cpfCnpj,
        email: customerEmail || undefined,
        mobilePhone: customerPhone || undefined,
        notificationDisabled: true,
      })
      asaasCustomerId = asaasCustomer.id
    }

    // Asaas payment
    const discountPercentage = ((originalAmount - params.agreedAmount) / originalAmount) * 100
    const installmentAmount = params.agreedAmount / params.installments

    const asaasPayment = await createAsaasPayment({
      customer: asaasCustomerId,
      billingType: "UNDEFINED",
      value: params.installments > 1 ? installmentAmount : params.agreedAmount,
      dueDate: params.dueDate,
      description: `Acordo de negociacao - ${customerName}${
        params.installments > 1 ? ` (Parcela 1/${params.installments})` : ""
      }`,
      externalReference: `agreement_${params.vmaxId}`,
      postalService: false,
      ...(params.installments > 1 && {
        installmentCount: params.installments,
        installmentValue: installmentAmount,
      }),
    })

    // Create agreement (using admin client, no RLS issues)
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
        status: "active",
        attendant_name: params.attendantName,
        terms: params.terms,
        asaas_customer_id: asaasCustomerId,
        asaas_payment_id: asaasPayment.id,
        asaas_payment_url: asaasPayment.invoiceUrl || null,
        asaas_pix_qrcode_url: asaasPayment.pixQrCodeUrl || null,
        asaas_boleto_url: asaasPayment.bankSlipUrl || null,
        payment_status: "pending",
      })
      .select()
      .single()

    if (agreementError) throw agreementError

    return {
      success: true,
      agreement: {
        ...agreement,
        asaas_payment_url: asaasPayment.invoiceUrl,
        asaas_pix_qrcode_url: asaasPayment.pixQrCodeUrl,
        asaas_boleto_url: asaasPayment.bankSlipUrl,
      },
      paymentUrl: asaasPayment.invoiceUrl,
    }
  } catch (error) {
    console.error("Error creating agreement (super admin):", error)
    throw error
  }
}
