"use server"

import { createClient } from "@/lib/supabase/server"
import { loadConfig, createPaymentProvider, PaymentService } from "@payment-api/index"

export async function createAgreementWithPayment(params: {
  vmaxId: string
  agreedAmount: number
  installments: number
  dueDate: string
  attendantName?: string
  terms?: string
}) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")

    // Get user profile to get company
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

    if (!profile?.company_id) throw new Error("Empresa não encontrada")

    // Get VMAX record
    const { data: vmaxRecord, error: vmaxError } = await supabase
      .from("VMAX")
      .select("*")
      .eq("id", params.vmaxId)
      .single()

    if (vmaxError || !vmaxRecord) {
      throw new Error("Registro não encontrado")
    }

    // Step 1: Create or get customer in our database
    const cpfCnpj = vmaxRecord["CPF/CNPJ"]?.replace(/[^\d]/g, "") || ""
    const customerName = vmaxRecord.Cliente || "Cliente"
    const customerPhone = vmaxRecord.Telefone?.replace(/[^\d]/g, "") || ""
    const customerEmail = vmaxRecord.Email || ""

    let customerId: string
    let customerUserId: string | null = null

    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, user_id")
      .eq("document", cpfCnpj)
      .eq("company_id", profile.company_id)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
      customerUserId = existingCustomer.user_id
    } else {
      // Search for user_id in profiles by cpf_cnpj
      const { data: profileData } = await supabase.from("profiles").select("id").eq("cpf_cnpj", cpfCnpj).single()

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
          user_id: profileData?.id || null,
        })
        .select("id, user_id")
        .single()

      if (customerError) throw customerError
      customerId = newCustomer.id
      customerUserId = newCustomer.user_id
    }

    // Step 2: Create or get debt
    const originalAmount = Number.parseFloat(vmaxRecord.Vencido?.replace(/[^\d,]/g, "").replace(",", ".") || "0")

    let debtId: string

    const { data: existingDebt } = await supabase
      .from("debts")
      .select("id")
      .eq("customer_id", customerId)
      .eq("company_id", profile.company_id)
      .eq("external_id", params.vmaxId)
      .single()

    if (existingDebt) {
      debtId = existingDebt.id
    } else {
      const { data: newDebt, error: debtError } = await supabase
        .from("debts")
        .insert({
          customer_id: customerId,
          company_id: profile.company_id,
          amount: originalAmount,
          description: `Dívida de ${customerName}`,
          status: "in_negotiation",
          source_system: "VMAX",
          external_id: params.vmaxId,
          user_id: customerUserId,
        })
        .select("id")
        .single()

      if (debtError) throw debtError
      debtId = newDebt.id
    }

    // Step 3: Create or get customer in payment provider
    const config = loadConfig()
    const provider = createPaymentProvider(config)
    const paymentService = new PaymentService(provider)

    let providerCustomerId: string

    const existingProviderCustomer = await paymentService.getCustomerByCpfCnpj(cpfCnpj, profile.company_id)

    if (existingProviderCustomer) {
      providerCustomerId = existingProviderCustomer.id
    } else {
      const providerCustomer = await paymentService.createCustomer(
        {
          name: customerName,
          cpfCnpj: cpfCnpj,
          email: customerEmail || undefined,
          mobilePhone: customerPhone || undefined,
        },
        profile.company_id
      )
      providerCustomerId = providerCustomer.id
    }

    // Step 4: Create payment in provider
    const discountPercentage = ((originalAmount - params.agreedAmount) / originalAmount) * 100
    const installmentAmount = params.agreedAmount / params.installments

    const providerPayment = await paymentService.createPayment(
      {
        customer: providerCustomerId,
        billingType: "UNDEFINED",
        value: params.installments > 1 ? installmentAmount : params.agreedAmount,
        dueDate: params.dueDate,
        description: `Acordo de negociação - ${customerName}${
          params.installments > 1 ? ` (Parcela 1/${params.installments})` : ""
        }`,
        externalReference: `agreement_${params.vmaxId}`,
        ...(params.installments > 1 && {
          installmentCount: params.installments,
          installmentValue: installmentAmount,
        }),
      },
      profile.company_id
    )

    // Step 5: Create agreement in our database with provider-agnostic columns
    const { data: agreement, error: agreementError } = await supabase
      .from("agreements")
      .insert({
        debt_id: debtId,
        customer_id: customerId,
        user_id: customerUserId,
        company_id: profile.company_id,
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
        // Provider-agnostic columns
        payment_provider: paymentService.activeProvider,
        provider_customer_id: providerCustomerId,
        provider_payment_id: providerPayment.id,
        provider_payment_url: providerPayment.paymentUrl || null,
        provider_pix_qrcode_url: providerPayment.pixQrCodeUrl || null,
        provider_boleto_url: providerPayment.boletoUrl || null,
        payment_status: "pending",
      })
      .select()
      .single()

    if (agreementError) throw agreementError

    // Step 6: Create notification for customer if they have user_id
    if (customerUserId) {
      await supabase.from("notifications").insert({
        user_id: customerUserId,
        company_id: profile.company_id,
        type: "agreement",
        title: "Nova Proposta de Acordo",
        description: `Você recebeu uma proposta de acordo no valor de R$ ${params.agreedAmount.toFixed(2)} em ${params.installments}x de R$ ${installmentAmount.toFixed(2)}`,
      })
    }

    return {
      success: true,
      agreement: {
        ...agreement,
        provider_payment_url: providerPayment.paymentUrl,
        provider_pix_qrcode_url: providerPayment.pixQrCodeUrl,
        provider_boleto_url: providerPayment.boletoUrl,
      },
      paymentUrl: providerPayment.paymentUrl,
      pixQrCodeUrl: providerPayment.pixQrCodeUrl,
      boletoUrl: providerPayment.boletoUrl,
    }
  } catch (error) {
    console.error("Error creating agreement with payment provider:", error)
    throw error
  }
}
