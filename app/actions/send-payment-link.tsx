"use server"

import { createAdminClient } from "@/lib/supabase/server"
import {
  getAsaasCustomerByCpfCnpj,
  createAsaasCustomer,
  updateAsaasCustomer,
  getAsaasCustomerNotifications,
  updateAsaasNotification,
  createAsaasPayment,
} from "@/lib/asaas"

export async function sendPaymentLink(
  agreementId: string,
  channel: "email" | "sms" | "whatsapp",
  contactInfo: {
    email?: string
    phone?: string
    customerName?: string
  }
) {
  try {
    const supabase = createAdminClient()

    const { data: agreement, error: agreementError } = await supabase
      .from("agreements")
      .select("*")
      .eq("id", agreementId)
      .single()

    if (agreementError || !agreement) {
      return { success: false, error: "Acordo nao encontrado" }
    }

    let asaasCustomerId = agreement.asaas_customer_id

    // If agreement doesn't have asaas_customer_id, create/find the customer now
    if (!asaasCustomerId) {
      // Get the customer document from DB
      const { data: customer } = await supabase
        .from("customers")
        .select("document, name, email, phone")
        .eq("id", agreement.customer_id)
        .single()

      if (!customer?.document) {
        return { success: false, error: "Cliente sem CPF/CNPJ cadastrado." }
      }

      const cpfCnpj = customer.document.replace(/[^\d]/g, "")

      try {
        // Try to find existing customer in Asaas
        const existingAsaas = await getAsaasCustomerByCpfCnpj(cpfCnpj)
        if (existingAsaas) {
          asaasCustomerId = existingAsaas.id
        } else {
          // Create new customer in Asaas
          const newAsaas = await createAsaasCustomer({
            name: customer.name || contactInfo.customerName || "Cliente",
            cpfCnpj,
            email: customer.email || contactInfo.email || undefined,
            mobilePhone: customer.phone || contactInfo.phone?.replace(/[^\d]/g, "") || undefined,
            notificationDisabled: true,
          })
          asaasCustomerId = newAsaas.id
        }

        // Save asaas_customer_id to agreement so next time it works directly
        await supabase
          .from("agreements")
          .update({ asaas_customer_id: asaasCustomerId })
          .eq("id", agreementId)
      } catch (asaasErr: any) {
        console.error("[v0] Failed to create Asaas customer. Error:", asaasErr.message)
        console.error("[v0] Full error:", asaasErr)
        if (asaasErr.message === "ASAAS_API_KEY_NOT_SET") {
          return { success: false, error: "ASAAS_API_KEY nao foi encontrada pelo servidor. Tente fazer redeploy do projeto para que as variaveis de ambiente sejam carregadas." }
        }
        return { success: false, error: `Erro ao criar cliente no Asaas: ${asaasErr.message}` }
      }
    }

    // 1. Update contact info
    const updateData: { notificationDisabled: boolean; email?: string; mobilePhone?: string } = { notificationDisabled: false }
    if (contactInfo.email) updateData.email = contactInfo.email
    if (contactInfo.phone) {
      updateData.mobilePhone = contactInfo.phone.replace(/[^\d]/g, "")
    }
    await updateAsaasCustomer(asaasCustomerId, updateData)

    // 2. Configure notifications
    const allNotifications = await getAsaasCustomerNotifications(asaasCustomerId)

    for (const notif of allNotifications) {
      if (notif.event === "PAYMENT_CREATED") {
        await updateAsaasNotification(notif.id, {
          enabled: true,
          emailEnabledForCustomer: channel === "email",
          smsEnabledForCustomer: channel === "sms",
          whatsappEnabledForCustomer: channel === "whatsapp",
        })
      } else {
        await updateAsaasNotification(notif.id, {
          enabled: false,
          emailEnabledForCustomer: false,
          smsEnabledForCustomer: false,
          whatsappEnabledForCustomer: false,
        })
      }
    }

    // 3. Create payment
    const customerName = contactInfo.customerName || "Cliente"
    const installmentAmount = agreement.installment_amount || agreement.agreed_amount
    const installments = agreement.installments || 1

    const paymentParams: any = {
      customer: asaasCustomerId,
      billingType: "UNDEFINED" as const,
      value: installments > 1 ? installmentAmount : agreement.agreed_amount,
      dueDate: agreement.due_date,
      description: `Acordo de negociacao - ${customerName}${installments > 1 ? ` (Parcela 1/${installments})` : ""}`,
      externalReference: `agreement_${agreementId}`,
      postalService: false,
    }

    if (installments > 1) {
      paymentParams.installmentCount = installments
      paymentParams.installmentValue = installmentAmount
    }

    const asaasPayment = await createAsaasPayment(paymentParams)

    // 4. Update agreement
    await supabase
      .from("agreements")
      .update({
        asaas_payment_id: asaasPayment.id,
        asaas_payment_url: asaasPayment.invoiceUrl || null,
        asaas_pix_qrcode_url: asaasPayment.pixQrCodeUrl || null,
        asaas_boleto_url: asaasPayment.bankSlipUrl || null,
        status: "active",
      })
      .eq("id", agreementId)

    // 5. Disable notifications again
    await updateAsaasCustomer(asaasCustomerId, { notificationDisabled: true })

    const paymentCreatedNotif = allNotifications.find((n: any) => n.event === "PAYMENT_CREATED")
    if (paymentCreatedNotif) {
      await updateAsaasNotification(paymentCreatedNotif.id, {
        enabled: false,
        emailEnabledForCustomer: false,
        smsEnabledForCustomer: false,
        whatsappEnabledForCustomer: false,
      })
    }

    const channelLabel = channel === "email" ? "e-mail" : channel === "whatsapp" ? "WhatsApp" : "SMS"

    return {
      success: true,
      data: {
        channel,
        paymentUrl: asaasPayment.invoiceUrl,
        message: `Cobranca criada e notificacao enviada via ${channelLabel}.`,
      },
    }
  } catch (error: any) {
    console.error("Error in sendPaymentLink:", error)
    return { success: false, error: error.message || "Erro ao enviar proposta" }
  }
}
